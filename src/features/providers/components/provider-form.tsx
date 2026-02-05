'use client';

import { useForm, Controller } from 'react-hook-form';
import type { Provider, ProviderInput } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface ProviderFormProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProviderInput | Provider) => void;
  provider?: Provider;
}

export function ProviderForm({
  isOpen,
  onOpenChange,
  onSubmit,
  provider,
}: ProviderFormProps) {
  const { register, handleSubmit, control, formState: { errors }, reset } = useForm<Provider>({
    defaultValues: provider || {
      name: '',
      baseURL: '',
      apiKey: '',
      models: [],
      apiType: 'openai',
    },
  });

  const handleFormSubmit = (data: Provider) => {
    const modelsArray = typeof data.models === 'string' ? (data.models as string).split(',').map((m: string) => m.trim()) : data.models;
    onSubmit({ ...data, models: modelsArray });
    reset();
    onOpenChange(false);
  };
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
        reset();
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{provider ? 'Edit' : 'Add'} AI Provider</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Provider Name</Label>
            <Input id="name" {...register('name', { required: 'Name is required' })} />
            {errors.name && <p className="text-destructive text-sm mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="baseURL">Base URL</Label>
            <Input id="baseURL" {...register('baseURL', { required: 'Base URL is required' })} />
            {errors.baseURL && <p className="text-destructive text-sm mt-1">{errors.baseURL.message}</p>}
          </div>
          <div>
            <Label htmlFor="apiKey">API Key</Label>
            <Input id="apiKey" type="password" {...register('apiKey', { required: 'API Key is required' })} />
            {errors.apiKey && <p className="text-destructive text-sm mt-1">{errors.apiKey.message}</p>}
          </div>
          <div>
            <Label htmlFor="models">Models (comma-separated)</Label>
            <Textarea
              id="models"
              {...register('models', { required: 'At least one model is required' })}
              defaultValue={provider?.models.join(', ')}
            />
            {errors.models && <p className="text-destructive text-sm mt-1">Models are required</p>}
          </div>
          <div>
            <Label htmlFor="apiType">API Type</Label>
            <Controller
              name="apiType"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select API type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="openai">OpenAI</SelectItem>
                    <SelectItem value="google">Google AI</SelectItem>
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                    <SelectItem value="custom">Custom OpenAI-compatible</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="ghost">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save Provider</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
