import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes: cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updateCart = [...cart];
      const productExits = updateCart.find(
        (product) => product.id === productId
      );

      const stock = await api.get(`/stock/${productId}`);
      const stockAmount = stock.data.amount;
      const currentAmount = productExits ? productExits.amount : 0;
      const totalAmount = currentAmount + 1;

      if (totalAmount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }
      if (productExits) {
        productExits.amount = totalAmount;
      } else {
        const product = await api.get(`/products/${productId}`);

        const newProduct = {
          ...product.data,
          amount: 1,
        };
        updateCart.push(newProduct);
      }
      setCart(updateCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updateCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find((product) => product.id === productId);

      if (!productExists) {
        toast.error("Erro na remoção do produto");
        return;
      }
      const newCart = cart.filter((product) => product.id !== productId);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
      setCart(newCart);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const productExists = cart.find((product) => product.id === productId);

      if (productExists) {
        const { data } = await api.get(`stock/${productId}`);
        const stock: Stock = data;

        if (amount > stock.amount) {
          toast.error("Quantidade solicitada fora de estoque");
        } else {
          productExists.amount = amount;
          const newCart = cart.filter((product) =>
            product.id === productId ? productExists : product
          );

          localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
          setCart(newCart);
        }
      } else {
        toast.error("Erro na alteração de quantidade do produto");
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
