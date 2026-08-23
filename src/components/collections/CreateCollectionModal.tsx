'use client';
import React from 'react';
import { CollectionModal } from './CollectionModal';

export interface CreateCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCollection: any) => void;
  selectedImageIds?: string[];
}

export function CreateCollectionModal(props: CreateCollectionModalProps) {
  return <CollectionModal mode="create" {...props} />;
}
