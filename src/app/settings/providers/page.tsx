'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useAppContext } from '@/shared/context';
import { ProviderList, ProviderForm } from '@/features/providers/components';
import type { AIProvider } from '@/lib/types';
import { useToast } from "@/shared/hooks"

export default function ProvidersPage() {
  const { providers, addProvider, updateProvider, deleteProvider } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProvider | undefined>(undefined);
  const { toast } = useToast()

  const handleAddClick = () => {
    setEditingProvider(undefined);
    setIsFormOpen(true);
  };

  const handleEditClick = (provider: AIProvider) => {
    setEditingProvider(provider);
    setIsFormOpen(true);
  };

  const handleSubmit = (data: Omit<AIProvider, 'id'> | AIProvider) => {
    if ('id' in data) {
      updateProvider(data);
      toast({ title: "Provider Updated", description: `"${data.name}" has been successfully updated.` })
    } else {
      addProvider(data);
      toast({ title: "Provider Added", description: `"${data.name}" has been successfully added.` })
    }
  };
  
  const handleDelete = (id: string) => {
    deleteProvider(id);
    toast({ title: "Provider Deleted", description: `The provider has been deleted.` })
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl md:text-2xl">AI Providers</CardTitle>
              <CardDescription className="text-sm md:text-base">
                Add, edit, or remove your AI provider configurations.
              </CardDescription>
            </div>
            <Button onClick={handleAddClick} className="w-full sm:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Provider
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ProviderList providers={providers} onEdit={handleEditClick} onDelete={handleDelete} />
        </CardContent>
      </Card>

      <ProviderForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleSubmit}
        provider={editingProvider}
      />
    </div>
  );
}
