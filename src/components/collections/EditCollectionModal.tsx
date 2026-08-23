'use client';
import React from 'react';
import { CollectionModal, CollectionModalData } from './CollectionModal';

export interface EditCollectionModalProps {
  isOpen: boolean;
  collection: CollectionModalData | null;
  onClose: () => void;
  onSuccess: (updatedCollection: any) => void;
}

export function EditCollectionModal(props: EditCollectionModalProps) {
  return <CollectionModal mode="edit" {...props} />;
}
