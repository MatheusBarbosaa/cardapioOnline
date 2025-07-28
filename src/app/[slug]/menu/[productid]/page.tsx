import { notFound } from "next/navigation";

import { db } from "@/lib/prisma";

import ProductDetails from "./components/product-details";
import ProductHeader from "./components/product-header";

interface ProductPageProps {
  params: Promise<{ slug: string; productid: string }>;
}

const ProductPage = async ({ params }: ProductPageProps) => {
  const { slug, productid } = await params;
  
  console.log("Params received:", { slug, productid });
  
  if (!productid) {
    console.error("Product ID is missing");
    return notFound();
  }
  
  const product = await db.product.findUnique({
    where: { id: productid }, // CORREÇÃO: use 'productid'
    include: {
      restaurant: {
        select: {
          name: true,
          avatarImageUrl: true,
          slug: true,
        },
      },
    },
  });
  
  if (!product) {
    console.error("Product not found for ID:", productid);
    return notFound();
  }
  
  if (product.restaurant.slug.toUpperCase() !== slug.toUpperCase()) {
    console.error("Restaurant slug mismatch");
    return notFound();
  }
  
  return (
    <div className="flex h-full flex-col">
      <ProductHeader product={product} />
      <ProductDetails product={product} />
    </div>
  );
};

export default ProductPage;