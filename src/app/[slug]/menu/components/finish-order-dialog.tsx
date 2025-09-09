"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ConsumptionMethod } from "@prisma/client";
import { loadStripe } from "@stripe/stripe-js";
import { Loader2Icon } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useContext, useState } from "react";
import { useForm } from "react-hook-form";
import { PatternFormat } from "react-number-format";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { createOrder } from "../actions/create-order";
import { createStripeCheckout } from "../actions/create-stripe-checkout";
import { CartContext } from "../contexts/cart";
import { isValidCpf } from "../helpers/cpf";

// Schema base com campos comuns
const baseSchema = {
  name: z.string().trim().min(1, { message: "O nome é obrigatório." }),
  cpf: z
    .string()
    .trim()
    .min(1, { message: "O CPF é obrigatório." })
    .refine((value) => isValidCpf(value), { message: "CPF inválido." }),
  phone: z
    .string()
    .trim()
    .min(1, { message: "O telefone é obrigatório." })
    .min(10, { message: "Telefone deve ter pelo menos 10 dígitos." }),
};

// Schema para DINE_IN
const pickupSchema = z.object(baseSchema);

// Schema para TAKEAWAY
const deliverySchema = z.object({
  ...baseSchema,
  address: z.string().trim().min(1, { message: "O endereço é obrigatório para entrega." }),
  reference: z.string().trim().optional(),
});

type PickupFormSchema = z.infer<typeof pickupSchema>;
type DeliveryFormSchema = z.infer<typeof deliverySchema>;

interface FinishOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FinishOrderDialog = ({ open, onOpenChange }: FinishOrderDialogProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { products } = useContext(CartContext);
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const consumptionMethod = searchParams.get("consumptionMethod") as ConsumptionMethod;
  const isDelivery = consumptionMethod === "TAKEAWAY";

  const dynamicSchema = isDelivery ? deliverySchema : pickupSchema;

  const form = useForm({
    resolver: zodResolver(dynamicSchema),
    defaultValues: {
      name: "",
      cpf: "",
      phone: "",
      ...(isDelivery ? { address: "", reference: "" } : {}),
    },
    shouldUnregister: true,
  });

  const onSubmit = async (data: PickupFormSchema | DeliveryFormSchema) => {
    try {
      setIsLoading(true);

      if (!products || products.length === 0) {
        throw new Error("Carrinho está vazio.");
      }

      if (!slug || !consumptionMethod) {
        throw new Error("Parâmetros obrigatórios ausentes.");
      }

      // Dados do pedido
      const orderData: Parameters<typeof createOrder>[0] = {
        consumptionMethod,
        customerCpf: data.cpf,
        customerName: data.name,
        customerPhone: data.phone,
        products,
        slug,
        ...(isDelivery
          ? {
              deliveryAddress: (data as DeliveryFormSchema).address,
              deliveryReference: (data as DeliveryFormSchema).reference || null,
            }
          : {}),
      };

      const order = await createOrder(orderData);

      const { sessionId } = await createStripeCheckout({
        products,
        orderId: order.id,
        slug,
        consumptionMethod,
        cpf: data.cpf,
      });

      if (!process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY) return;

      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY);
      await stripe?.redirectToCheckout({ sessionId });

    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);
      alert("Erro ao finalizar o pedido. Verifique os dados e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger asChild></DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Finalizar Pedido</DrawerTitle>
          <DrawerDescription>
            {isDelivery
              ? "Insira suas informações e endereço para entrega."
              : "Insira suas informações para retirada."}
          </DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[60vh] overflow-y-auto px-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seu nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite seu nome..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seu CPF</FormLabel>
                    <FormControl>
                      <PatternFormat
                        placeholder="Digite seu CPF..."
                        format="###.###.###-##"
                        customInput={Input}
                        {...field}
                      />
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
                      <PatternFormat
                        placeholder="(11) 99999-9999"
                        format="(##) #####-####"
                        customInput={Input}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isDelivery && (
                <>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço completo</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Rua, número, complemento, bairro, cidade..."
                            className="min-h-[80px] resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ponto de referência (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ex: Próximo ao mercado, em frente à escola..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </form>
          </Form>
        </div>

        <DrawerFooter className="border-t">
          <Button
            onClick={form.handleSubmit(onSubmit)}
            variant="destructive"
            className="rounded-full"
            disabled={isLoading}
          >
            {isLoading && <Loader2Icon className="animate-spin" />}
            Finalizar
          </Button>
          <DrawerClose asChild>
            <Button className="w-full rounded-full" variant="outline">
              Cancelar
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default FinishOrderDialog;
