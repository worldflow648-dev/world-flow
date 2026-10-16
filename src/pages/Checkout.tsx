import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useCreateOrder } from "@/hooks/useMerchantOrders";
import { useGovernorates } from "@/hooks/useCatalogData";
import { useImageUpload } from "@/hooks/useStorage";
import { supabase } from "@/integrations/supabase/client";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import { CustomerForm, CustomerData } from "@/components/checkout/CustomerForm";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { MerchantLayout } from "@/components/MerchantLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useRefreshCartPrices } from "@/hooks/useRefreshCartPrices";

const Checkout = () => {
  const navigate = useNavigate();
  const { items, clearCart, getTotal } = useCart();
  const createOrder = useCreateOrder();
  const uploadImage = useImageUpload();
  const { data: governorates } = useGovernorates();
  const { t, isRTL } = useLanguage();
  useRefreshCartPrices();
  const [currentStep, setCurrentStep] = useState(2);
  const [isUploading, setIsUploading] = useState(false);
  const [customerData, setCustomerData] = useState<CustomerData>({
    name: "", governorate: "", region: "", landmark: "", phone1: "", phone2: "", notes: "",
  });

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  if (items.length === 0) {
    navigate("/cart");
    return null;
  }

  const handleBack = () => {
    if (currentStep === 2) navigate("/cart");
    else setCurrentStep((prev) => prev - 1);
  };

  const handleNext = () => setCurrentStep((prev) => prev + 1);

  const getShippingFee = () => {
    const gov = governorates?.find(g => g.id === customerData.governorate);
    return gov?.shipping_fee || 5000;
  };

  const handleConfirm = async (discountInfo: { code: string; amount: number; tierDiscountAmount: number; depositAmount: number; depositReceiptFile: File | null; merchantPaymentAmount: number; merchantPaymentReceiptFile: File | null }) => {
    setIsUploading(true);
    try {
      const uploadedItems = await Promise.all(
        items.map(async (item) => {
          const designUrls: string[] = [];
          const mockupUrls: string[] = [];
          if (item.designFiles && item.designFiles.length > 0) {
            const results = await Promise.all(
              item.designFiles.map((f) =>
                uploadImage.mutateAsync({ file: f, bucket: 'designs', path: `orders/${Date.now()}` })
              )
            );
            results.forEach((r) => designUrls.push(r.url));
          }
          if (item.mockupFiles && item.mockupFiles.length > 0) {
            const results = await Promise.all(
              item.mockupFiles.map((f) =>
                uploadImage.mutateAsync({ file: f, bucket: 'designs', path: `orders/${Date.now()}` })
              )
            );
            results.forEach((r) => mockupUrls.push(r.url));
          }
          return { ...item, designUrls, mockupUrls };
        })
      );


      // Upload deposit receipt if present
      let depositReceiptUrl: string | null = null;
      if (discountInfo.depositReceiptFile) {
        const result = await uploadImage.mutateAsync({ file: discountInfo.depositReceiptFile, bucket: 'designs', path: `deposits/${Date.now()}` });
        depositReceiptUrl = result.url;
      }

      // Upload merchant payment receipt if present
      let merchantPaymentReceiptUrl: string | null = null;
      if (discountInfo.merchantPaymentReceiptFile) {
        const result = await uploadImage.mutateAsync({ file: discountInfo.merchantPaymentReceiptFile, bucket: 'designs', path: `merchant-payments/${Date.now()}` });
        merchantPaymentReceiptUrl = result.url;
      }

      const shippingFee = getShippingFee();
      const totalMerchantCost = getTotal() - discountInfo.tierDiscountAmount;
      const totalWholesaleCost = uploadedItems.reduce((sum, item) => sum + item.product.wholesale_price * item.quantity, 0);
      const perItemDiscountTotal = uploadedItems.reduce((sum, item) => sum + ((item.discountAmount ?? 0) * item.quantity), 0);
      const finalRetailPrice = uploadedItems.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0) - perItemDiscountTotal - discountInfo.amount;
      const netProfit = finalRetailPrice - totalMerchantCost;

      createOrder.mutate(
        {
          customer_name: customerData.name, customer_phone: customerData.phone1,
          customer_phone2: customerData.phone2 || undefined, governorate: customerData.governorate,
          region: customerData.region || undefined, landmark: customerData.landmark || undefined,
          merchant_notes: customerData.notes || undefined, shipping_fee: shippingFee,
          total_merchant_cost: totalMerchantCost, total_wholesale_cost: totalWholesaleCost,
          final_retail_price: finalRetailPrice, net_profit: netProfit,
          discount_code: discountInfo.code || undefined, discount_amount: discountInfo.amount || 0,
          deposit_amount: discountInfo.depositAmount || 0, deposit_receipt_url: depositReceiptUrl || undefined,
          merchant_payment_amount: discountInfo.merchantPaymentAmount || 0, merchant_payment_receipt_url: merchantPaymentReceiptUrl || undefined,
          items: uploadedItems.map((item) => ({
            product_id: item.product.id, product_name: item.product.name,
            product_image: item.product.images?.[0] || null, size: item.selectedSize,
            color: item.selectedColor ?? null,
            // variant_id is forwarded to the RPC for unambiguous, color-aware resolution
            variant_id: item.selectedVariantId ?? null,
            quantity: item.quantity, merchant_price: item.product.merchant_price,
            wholesale_price: item.product.wholesale_price, retail_price: item.retailPrice,
            addons: item.addons.map((addon) => ({ addonId: addon.id, optionId: addon.optionId ?? null })),
            design_file_url: item.designUrls[0] ?? null,
            mockup_file_url: item.mockupUrls[0] ?? null,
            design_file_urls: item.designUrls,
            mockup_file_urls: item.mockupUrls,
            discount_code: item.discountCode ?? null,
          } as any)),
        },

        {
          onSuccess: async (order) => {
            toast.success(t('checkout.orderConfirmed'), { description: t('checkout.orderConfirmedDesc') });
            clearCart();
            navigate(`/order-success/${order.id}`);
          },
          onError: (error) => { toast.error(t('checkout.orderError'), { description: error.message }); },
        }
      );
    } catch (error) {
      toast.error(t('checkout.uploadError'), { description: t('checkout.tryAgain') });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <MerchantLayout hideHeader>
      <div className="overflow-x-hidden">
        <header className="sticky top-0 z-40 glass border-b border-border/50">
          <div className="flex items-center gap-3 py-4 px-4">
            <button onClick={handleBack} className="p-2 hover:bg-secondary rounded-full transition-colors">
              <BackArrow className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold flex-1">{t('checkout.title')}</h1>
          </div>
        </header>

        <div className="bg-card border-b border-border/50">
          <CheckoutStepper currentStep={currentStep} />
        </div>

        <div className="pb-32">
          {currentStep === 2 && (
            <CustomerForm data={customerData} onChange={setCustomerData} onNext={handleNext} onBack={handleBack} />
          )}
          {currentStep === 3 && (
            <OrderSummary customerData={customerData} shippingFee={getShippingFee()} onConfirm={handleConfirm} onBack={handleBack} isSubmitting={isUploading || createOrder.isPending} />
          )}
        </div>
      </div>
    </MerchantLayout>
  );
};

export default Checkout;
