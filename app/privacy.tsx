import React from 'react';
import { LegalDocumentScreen } from '../components/LegalDocumentScreen';
import { PRIVACY_BODY, PRIVACY_TITLE } from '../constants/legalContent';

export default function PrivacyPage() {
  return <LegalDocumentScreen title={PRIVACY_TITLE} body={PRIVACY_BODY} />;
}
