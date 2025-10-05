import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { usePatients } from '@/hooks/usePatients';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const patientSchema = z.object({
  full_name: z.string()
    .trim()
    .min(1, 'Nome é obrigatório')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string()
    .trim()
    .email('Email inválido')
    .max(255, 'Email deve ter no máximo 255 caracteres'),
  phone: z.string()
    .trim()
    .max(20, 'Telefone deve ter no máximo 20 caracteres')
    .optional()
    .or(z.literal('')),
  birth_date: z.string()
    .min(1, 'Data de nascimento é obrigatória')
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 1;
    }, 'Paciente deve ter pelo menos 1 ano'),
  additional_info: z.string()
    .trim()
    .max(500, 'Informações adicionais devem ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
});

type PatientFormData = z.infer<typeof patientSchema>;

interface PatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    birth_date: string;
    additional_info?: string | null;
  };
}

export function PatientDialog({ open, onOpenChange, patient }: PatientDialogProps) {
  const { createPatient, isCreating, updatePatient, isUpdating } = usePatients();
  
  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      full_name: patient?.full_name || '',
      email: patient?.email || '',
      phone: patient?.phone || '',
      birth_date: patient?.birth_date || '',
      additional_info: patient?.additional_info || '',
    },
  });

  // Update form when patient changes
  React.useEffect(() => {
    if (patient) {
      form.reset({
        full_name: patient.full_name,
        email: patient.email,
        phone: patient.phone || '',
        birth_date: patient.birth_date,
        additional_info: patient.additional_info || '',
      });
    }
  }, [patient, form]);

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (data: PatientFormData) => {
    try {
      if (patient) {
        await updatePatient({
          id: patient.id,
          data: {
            full_name: data.full_name,
            email: data.email,
            birth_date: data.birth_date,
            phone: data.phone || null,
            additional_info: data.additional_info || null,
          },
        });
        toast.success('Paciente atualizada com sucesso!');
      } else {
        const newPatient = await createPatient({
          full_name: data.full_name,
          email: data.email,
          birth_date: data.birth_date,
          phone: data.phone || null,
          additional_info: data.additional_info || null,
        });
        
        // Send invitation email
        if (newPatient) {
          try {
            const { error: emailError } = await supabase.functions.invoke('send-patient-invite', {
              body: {
                patientId: newPatient.id,
                email: data.email,
                fullName: data.full_name,
              },
            });

            if (emailError) {
              console.error('Error sending invitation email:', emailError);
              toast.warning('Paciente cadastrado, mas houve erro ao enviar o convite por email.');
            } else {
              toast.success('Paciente cadastrado e convite enviado por email!');
            }
          } catch (error) {
            console.error('Error invoking send-patient-invite:', error);
            toast.warning('Paciente cadastrado, mas houve erro ao enviar o convite.');
          }
        } else {
          toast.success('Paciente cadastrado com sucesso!');
        }
      }
      
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving patient:', error);
      
      // Check for duplicate email error
      if (error?.code === '23505' || error?.message?.includes('duplicate key')) {
        toast.error('Este email já está cadastrado no sistema!');
      } else {
        toast.error(patient ? 'Erro ao atualizar paciente. Tente novamente.' : 'Erro ao cadastrar paciente. Tente novamente.');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{patient ? 'Editar Paciente' : 'Cadastrar Nova Paciente'}</DialogTitle>
          <DialogDescription>
            {patient 
              ? 'Atualize os dados da paciente abaixo.' 
              : 'Preencha os dados da paciente. Um convite será enviado automaticamente.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Maria Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Ex: maria@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: (11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="birth_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="additional_info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Informações Adicionais</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Ex: Alergias, observações importantes..." 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleClose(false)}
                disabled={isCreating || isUpdating}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating}>
                {isCreating || isUpdating 
                  ? (patient ? 'Salvando...' : 'Cadastrando...') 
                  : (patient ? 'Salvar Alterações' : 'Cadastrar Paciente')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
