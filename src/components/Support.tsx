import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSeason } from '../contexts/SeasonalContext';
import { useRouter } from '../contexts/RouterContext';
import { ChevronLeftIcon, CheckCircleIcon } from './Icons';
import FAQ from './FAQ';

const Support: React.FC = () => {
  const { colors } = useSeason();
  const { pushPath } = useRouter();
  const [activeTab, setActiveTab] = useState<'faq' | 'contact'>('faq');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) return;
    setIsSubmitted(true);
    setName('');
    setEmail('');
    setMessage('');
  };

  return (
    <div className={`min-h-screen flex flex-col p-4 sm:p-8 font-sans ${colors.bgSimple}`}>
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between mb-8">
        <button
          onClick={() => pushPath('/')}
          className={`flex items-center space-x-2 ${colors.secondaryText} hover:text-accent transition-colors`}
        >
          <ChevronLeftIcon className="h-6 w-6" />
          <span className="font-medium">Back</span>
        </button>
        <h1 className={`text-xl font-mono font-bold ${colors.primaryText}`}>Support Center</h1>
      </header>

      <main className="max-w-5xl w-full mx-auto flex-1 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-8 rounded-3xl border backdrop-blur-lg ${colors.surface} ${colors.border} text-center space-y-4 shadow-lg`}
        >
          <div className="text-4xl">💬</div>
          <h2 className={`text-3xl font-serif font-bold ${colors.primaryText}`}>
            How can we help you today?
          </h2>
          <p className={`text-sm ${colors.secondaryText} max-w-xl mx-auto`}>
            Explore our frequently asked questions, learn how to use NoteNirman's AI capabilities, or reach out to our dedicated support team directly.
          </p>

          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => setActiveTab('faq')}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
                activeTab === 'faq'
                  ? 'bg-accent text-primary-bg shadow-md'
                  : `${colors.border} border ${colors.primaryText} ${colors.hover}`
              }`}
            >
              Frequently Asked Questions
            </button>
            <button
              onClick={() => setActiveTab('contact')}
              className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all ${
                activeTab === 'contact'
                  ? 'bg-accent text-primary-bg shadow-md'
                  : `${colors.border} border ${colors.primaryText} ${colors.hover}`
              }`}
            >
              Contact Support
            </button>
          </div>
        </motion.div>

        {activeTab === 'faq' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-lg ${colors.surface} ${colors.border}`}
          >
            <FAQ onBack={() => pushPath('/')} />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`p-6 sm:p-8 rounded-3xl border backdrop-blur-lg ${colors.surface} ${colors.border} max-w-2xl mx-auto space-y-6 shadow-lg`}
          >
            <div className="space-y-1 text-center">
              <h3 className={`text-2xl font-serif font-bold ${colors.primaryText}`}>Get in Touch</h3>
              <p className={`text-xs ${colors.secondaryText}`}>
                We typically respond within 24 hours. You can also email us directly at{' '}
                <a href="mailto:rhytambiswas@gmail.com" className="text-accent underline font-semibold">
                  rhytambiswas@gmail.com
                </a>.
              </p>
            </div>

            {isSubmitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 text-center space-y-4"
              >
                <div className="h-16 w-16 bg-success/10 rounded-full flex items-center justify-center mx-auto text-success">
                  <CheckCircleIcon className="h-10 w-10" />
                </div>
                <h4 className={`text-xl font-bold ${colors.primaryText}`}>Message Received!</h4>
                <p className={`text-sm ${colors.secondaryText}`}>
                  Thank you for contacting NoteNirman support. We have received your inquiry and will get back to you shortly.
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="px-6 py-2 bg-accent text-primary-bg font-bold rounded-xl text-xs hover:bg-accent/90"
                >
                  Send Another Message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmitContact} className="space-y-4">
                <div>
                  <label className={`block text-xs font-semibold ${colors.secondaryText} mb-1`}>Your Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:ring-accent focus:border-accent ${colors.surface} ${colors.border} ${colors.primaryText}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold ${colors.secondaryText} mb-1`}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:ring-accent focus:border-accent ${colors.surface} ${colors.border} ${colors.primaryText}`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-semibold ${colors.secondaryText} mb-1`}>Message / Issue Details *</label>
                  <textarea
                    required
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe how we can help you..."
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:ring-accent focus:border-accent ${colors.surface} ${colors.border} ${colors.primaryText}`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-accent text-primary-bg font-bold rounded-xl hover:bg-accent/90 transition-all text-sm shadow-md"
                >
                  Submit Support Ticket
                </button>
              </form>
            )}
          </motion.div>
        )}

        <div className="flex flex-wrap justify-center gap-6 text-xs text-secondary-text opacity-80 pt-4">
          <button onClick={() => pushPath('/privacy')} className="hover:text-accent underline">Privacy Policy</button>
          <button onClick={() => pushPath('/terms')} className="hover:text-accent underline">Terms of Service</button>
          <button onClick={() => pushPath('/cookies')} className="hover:text-accent underline">Cookie Preferences</button>
        </div>
      </main>
    </div>
  );
};

export default Support;
