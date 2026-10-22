"use client";

import { useState } from "react";

import { CheckCircle2, LockKeyhole, StarIcon } from "lucide-react";

import { toast } from "sonner";

import { Button } from "@/app/_components/ui/button";

import { Textarea } from "@/app/_components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/_components/ui/dialog";

import { createReview } from "@/app/_actions/create-review";

interface ReviewFormProps {
  barbershopId: string;
  hasCompletedBooking: boolean;
  hasReviewed: boolean;
}

const ReviewForm = ({
  barbershopId,
  hasCompletedBooking,
  hasReviewed,
}: ReviewFormProps) => {
  // ============================================================
  // ESTADO DO MODAL
  // ============================================================

  const [open, setOpen] = useState(false);

  // ============================================================
  // ESTADO DA AVALIAÇÃO
  // ============================================================

  const [rating, setRating] = useState(0);

  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(false);

  // ============================================================
  // CLIENTE JÁ AVALIOU
  // ============================================================
  //
  // Não mostramos o botão de avaliação porque a regra do sistema
  // permite apenas uma avaliação por cliente/barbearia.
  //

  if (hasReviewed) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3">
        <CheckCircle2 className="h-5 w-5 text-green-600" />

        <div>
          <p className="font-medium text-green-700">
            Você já avaliou esta barbearia
          </p>

          <p className="text-sm text-muted-foreground">
            Obrigado pelo seu feedback!
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // CLIENTE AINDA NÃO POSSUI ATENDIMENTO CONCLUÍDO
  // ============================================================
  //
  // A avaliação somente pode ser feita depois que o barbeiro
  // marcar o atendimento como COMPLETED.
  //

  if (!hasCompletedBooking) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-4 py-3">
        <LockKeyhole className="h-5 w-5 shrink-0 text-muted-foreground" />

        <div>
          <p className="font-medium">Avaliação indisponível</p>

          <p className="text-sm text-muted-foreground">
            🔒 Avaliação disponível após a conclusão do atendimento.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // ENVIAR AVALIAÇÃO
  // ============================================================

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Escolha uma nota de 1 a 5 estrelas.");
      return;
    }

    try {
      setLoading(true);

      await createReview({
        barbershopId,
        rating,
        comment,
      });

      toast.success("Avaliação enviada com sucesso!");

      setRating(0);
      setComment("");
      setOpen(false);

      window.location.reload();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a avaliação.",
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // FORMULÁRIO DE AVALIAÇÃO
  // ============================================================

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <StarIcon className="mr-2 h-4 w-4" />
            Avaliar barbearia
          </Button>
        }
      />

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avaliar barbearia</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* =====================================================
              NOTA
          ===================================================== */}

          <div>
            <p className="mb-2 text-sm font-medium">
              Como foi sua experiência?
            </p>

            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                  aria-label={`Dar ${star} estrela${star > 1 ? "s" : ""}`}
                >
                  <StarIcon
                    size={32}
                    className={
                      star <= rating
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }
                  />
                </button>
              ))}
            </div>
          </div>

          {/* =====================================================
              COMENTÁRIO
          ===================================================== */}

          <div>
            <p className="mb-2 text-sm font-medium">Comentário</p>

            <Textarea
              placeholder="Conte como foi seu atendimento..."
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              maxLength={500}
            />
          </div>

          {/* =====================================================
              ENVIAR
          ===================================================== */}

          <Button className="w-full" onClick={handleSubmit} disabled={loading}>
            {loading ? "Enviando..." : "Enviar avaliação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewForm;
