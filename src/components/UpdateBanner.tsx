import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { useUpdateCheck } from '../hooks/useUpdateCheck';
import UpdateModal from './UpdateModal';

/**
 * Tells installed desktop/Android users a newer build exists. Never a silent auto-update: it only
 * links to the download. Renders nothing on web, in the Microsoft Store build, or until the website's
 * version manifest (which the maintainer controls) announces a newer version.
 */
const UpdateBanner: React.FC = () => {
  const { info, dismiss } = useUpdateCheck();
  return (
    <AnimatePresence>
      {info && <UpdateModal info={info} onClose={dismiss} />}
    </AnimatePresence>
  );
};

export default UpdateBanner;
