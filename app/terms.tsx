import React from 'react';
import { LegalDocumentScreen } from '../components/LegalDocumentScreen';
import { TERMS_BODY, TERMS_TITLE } from '../constants/legalContent';

export default function TermsPage() {
  return <LegalDocumentScreen title={TERMS_TITLE} body={TERMS_BODY} />;
}
