import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { LegalDocumentScreen } from '../../components/LegalDocumentScreen';
import {
  PRIVACY_BODY,
  PRIVACY_TITLE,
  TERMS_BODY,
  TERMS_TITLE,
} from '../../constants/legalContent';

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const isPrivacy = doc === 'privacy';

  return (
    <LegalDocumentScreen
      title={isPrivacy ? PRIVACY_TITLE : TERMS_TITLE}
      body={isPrivacy ? PRIVACY_BODY : TERMS_BODY}
    />
  );
}
