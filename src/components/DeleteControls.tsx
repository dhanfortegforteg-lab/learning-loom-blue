import { type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ConfirmProps = {
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  children: ReactNode;
};

export function ConfirmDelete({ title, description, confirmLabel = "Excluir", onConfirm, children }: ConfirmProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Small icon button to delete a single saved item. */
export function DeleteItemButton({
  label = "este item",
  onConfirm,
  className = "",
}: {
  label?: string;
  onConfirm: () => void | Promise<void>;
  className?: string;
}) {
  return (
    <ConfirmDelete
      title="Excluir?"
      description={`Tem certeza que deseja excluir ${label}? Essa ação não pode ser desfeita.`}
      onConfirm={onConfirm}
    >
      <Button
        size="icon"
        variant="ghost"
        aria-label="Excluir"
        className={`shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive ${className}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </ConfirmDelete>
  );
}

/** Button to wipe every saved record of a given kind. */
export function DeleteAllButton({
  label,
  count,
  onConfirm,
}: {
  label: string;
  count: number;
  onConfirm: () => void | Promise<void>;
}) {
  if (!count) return null;
  return (
    <ConfirmDelete
      title={`Excluir tudo (${count})?`}
      description={`Todos os registros de ${label} serão apagados permanentemente. Essa ação não pode ser desfeita.`}
      confirmLabel="Excluir tudo"
      onConfirm={onConfirm}
    >
      <Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10">
        <Trash2 className="mr-2 h-4 w-4" /> Excluir tudo
      </Button>
    </ConfirmDelete>
  );
}
