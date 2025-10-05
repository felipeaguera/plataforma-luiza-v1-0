import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { usePatients } from '@/hooks/usePatients';
import { Search, Pencil, Trash2, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function PatientsList() {
  const { patients, deletePatient, isDeleting } = usePatients();
  const [searchTerm, setSearchTerm] = useState('');
  const [patientToDelete, setPatientToDelete] = useState<string | null>(null);

  const filteredPatients = patients.filter(patient =>
    patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async () => {
    if (!patientToDelete) return;
    
    try {
      await deletePatient(patientToDelete);
      toast.success('Paciente removida com sucesso!');
      setPatientToDelete(null);
    } catch (error) {
      toast.error('Erro ao remover paciente.');
      console.error('Error deleting patient:', error);
    }
  };

  const getStatusBadge = (patient: any) => {
    if (patient.activated_at) {
      return <Badge variant="default" className="bg-green-600">Ativa</Badge>;
    }
    if (patient.invite_sent_at) {
      return <Badge variant="secondary">Convite Enviado</Badge>;
    }
    return <Badge variant="outline">Pendente</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pacientes Cadastradas</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" size={18} />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhuma paciente encontrada.' : 'Nenhuma paciente cadastrada ainda.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Data Nasc.</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-medium">{patient.full_name}</TableCell>
                      <TableCell>{patient.email}</TableCell>
                      <TableCell>{patient.phone || '-'}</TableCell>
                      <TableCell>
                        {format(new Date(patient.birth_date), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell>{getStatusBadge(patient)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {!patient.activated_at && (
                            <Button size="sm" variant="outline" title="Reenviar convite">
                              <Mail size={16} />
                            </Button>
                          )}
                          <Button size="sm" variant="outline" title="Editar">
                            <Pencil size={16} />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            title="Excluir"
                            onClick={() => setPatientToDelete(patient.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!patientToDelete} onOpenChange={() => setPatientToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta paciente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
