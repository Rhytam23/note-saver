import type { Note } from '../types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import DOMPurify from 'dompurify';

// --- Helper Functions ---

export const stripHtml = (html: string): string => {
    // Create a temporary element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Add line breaks for block elements to preserve structure
    tempDiv.querySelectorAll('p, blockquote').forEach(el => {
        el.appendChild(document.createTextNode('\n\n'));
    });
    tempDiv.querySelectorAll('br').forEach(el => {
        el.replaceWith(document.createTextNode('\n'));
    });
    tempDiv.querySelectorAll('li').forEach(el => {
        el.prepend(document.createTextNode('â€¢ '));
        el.appendChild(document.createTextNode('\n'));
    });

    // Extract text content, which now includes the added newlines
    let text = tempDiv.textContent || "";
    
    // Clean up extra whitespace
    text = text.replace(/ \n/g, '\n'); // remove spaces before newlines
    text = text.replace(/\n\s*\n/g, '\n\n'); // collapse multiple newlines into a max of two
    
    return text.trim();
};

const htmlToMarkdown = (html: string): string => {
  let markdown = html;
  // Basic conversions. For more complex scenarios, a library would be better.
  markdown = markdown.replace(/<p>(.*?)<\/p>/gi, '$1\n\n');
  markdown = markdown.replace(/<b>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<strong>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<i>(.*?)<\/i>/gi, '*$1*');
  markdown = markdown.replace(/<em>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<u>(.*?)<\/u>/gi, '$1'); // Underline is not standard MD
  markdown = stripHtml(markdown); // Strip any remaining tags
  return markdown.trim();
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const slugify = (text: string) => {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(/[^\w\-]+/g, '') // Remove all non-word chars
        .replace(/\-\-+/g, '-'); // Replace multiple - with single -
}

// --- Export Functions ---

// Export a single note
export const exportNote = (note: Note, format: 'txt' | 'md' | 'pdf') => {
  const filename = slugify(note.title) || 'untitled-note';

  switch (format) {
    case 'txt':
      const txtContent = `Title: ${note.title}\nTags: ${note.tags.join(', ')}\n\n---\n\n${stripHtml(note.content)}`;
      downloadFile(txtContent, `${filename}.txt`, 'text/plain;charset=utf-8;');
      break;

    case 'md':
      const mdContent = `# ${note.title}\n\n**Tags:** ${note.tags.map(t => `\`${t}\``).join(', ')}\n\n---\n\n${htmlToMarkdown(note.content)}`;
      downloadFile(mdContent, `${filename}.md`, 'text/markdown;charset=utf-8;');
      break;

    case 'pdf':
      exportAsPdf(note);
      break;
  }
};

// PDF generation for a single note
const exportAsPdf = async (note: Note) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'px',
    format: 'a4',
  });

  const tempContainer = document.createElement('div');
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.width = '400px'; // A fixed width for consistent rendering
  tempContainer.style.padding = '20px';
  tempContainer.style.fontFamily = 'Lora, serif';
  tempContainer.style.color = '#000';
  document.body.appendChild(tempContainer);
  
  tempContainer.innerHTML = `
    <h1 style="font-family: Poppins, sans-serif; font-size: 24px; border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 16px;">${DOMPurify.sanitize(note.title)}</h1>
    <div style="font-size: 14px; line-height: 1.6;">${DOMPurify.sanitize(note.content)}</div>
  `;

  const canvas = await html2canvas(tempContainer, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');

  const pdfWidth = doc.internal.pageSize.getWidth();
  const pdfHeight = doc.internal.pageSize.getHeight();
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  
  const ratio = imgWidth / imgHeight;
  const canvasPdfWidth = pdfWidth - 20; // with margin
  const canvasPdfHeight = canvasPdfWidth / ratio;
    
  doc.addImage(imgData, 'PNG', 10, 10, canvasPdfWidth, canvasPdfHeight);
  
  document.body.removeChild(tempContainer);

  const filename = `${slugify(note.title) || 'untitled-note'}.pdf`;
    
  doc.save(filename);
};
