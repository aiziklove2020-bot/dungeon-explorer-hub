import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart, Check } from "lucide-react";
import { PageLayout, PageHeader } from "@/components/PageLayout";
import { getProducts, getStoreSettings, createOrder } from "@/firebase/store";
import { isValidIsraeliPhone } from "@/utils/phone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "חנות | מסיבות ליברליות בישראל" },
      {
        name: "description",
        content:
          "חנות הקהילה — כלים, אביזרים וביגוד לעולם הליברלי. כלים חדשים נוספים כל הזמן.",
      },
      { property: "og:title", content: "חנות | מסיבות ליברליות בישראל" },
      { property: "og:description", content: "כלים ואביזרים לקהילה." },
      { property: "og:url", content: "/shop" },
    ],
    links: [{ rel: "canonical", href: "/shop" }],
  }),
  component: Shop,
});

type CartItem = {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  maxStock: number;
};

function Shop() {
  const [products, setProducts] = useState<any[]>([]);
  const [storeEnabled, setStoreEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [formError, setFormError] = useState("");

  function loadData() {
    setLoading(true);
    Promise.all([getProducts(true), getStoreSettings()])
      .then(([prods, settings]) => {
        setProducts(prods);
        setStoreEnabled(!!settings?.enabled);
      })
      .catch(() => {
        setProducts([]);
        setStoreEnabled(false);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  function addToCart(product: any) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          price: product.price,
          quantity: 1,
          maxStock: product.stock,
        },
      ];
    });
  }

  function updateQuantity(productId: string, next: number) {
    if (next <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, quantity: Math.min(next, i.maxStock) }
          : i
      )
    );
  }

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!customerName.trim()) {
      setFormError("נא להזין שם מלא");
      return;
    }
    if (!isValidIsraeliPhone(customerPhone)) {
      setFormError("נא להזין מספר טלפון תקין");
      return;
    }
    setSubmitting(true);
    try {
      await createOrder({
        customerName,
        customerPhone,
        items: cart.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
          discount: 0,
        })),
        totalPrice: cartTotal,
        discountApplied: 0,
        finalPrice: cartTotal,
        userType: "store",
      });
      setOrderSuccess(true);
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      loadData();
    } catch (err) {
      setFormError("שגיאה בשליחת ההזמנה, נסה שוב");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageLayout>
      <PageHeader title="חנות" subtitle="כלים חדשים נוספים כל הזמן" />
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-4">
          {cart.length > 0 && (
            <div className="mb-6 flex justify-end">
              <button
                onClick={() => setCartOpen(true)}
                className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition-transform hover:scale-105"
              >
                <ShoppingCart size={18} />
                סל קניות ({cartCount})
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-center text-muted-foreground">טוען מוצרים...</p>
          ) : !storeEnabled ? (
            <p className="text-center text-muted-foreground">
              החנות סגורה כרגע — נא לבדוק שוב בקרוב.
            </p>
          ) : products.length === 0 ? (
            <p className="text-center text-muted-foreground">
              אין מוצרים זמינים כרגע.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => {
                const inCart = cart.find((i) => i.productId === p.id);
                const atLimit = inCart && inCart.quantity >= p.stock;
                return (
                  <div
                    key={p.id}
                    className="flex flex-col items-center rounded-2xl border border-border bg-card p-7 text-center"
                  >
                    <div className="mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-secondary text-4xl">
                      {p.images?.[0] ? (
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        "🛍️"
                      )}
                    </div>
                    <h3 className="text-lg font-bold">{p.name}</h3>
                    <span className="mt-1 text-gold">₪{p.price}</span>
                    <button
                      onClick={() => addToCart(p)}
                      disabled={!p.stock || atLimit}
                      className="mt-4 w-full rounded-full border border-primary px-6 py-2 font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {p.stock ? (inCart ? `בסל (${inCart.quantity})` : "הוסף לסל") : "אזל מהמלאי"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Cart dialog */}
      <Dialog open={cartOpen} onOpenChange={setCartOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>סל הקניות שלך</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {cart.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div>
                  <p className="font-bold">{item.productName}</p>
                  <p className="text-sm text-muted-foreground">₪{item.price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="h-8 w-8 rounded-full border border-border font-bold"
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= item.maxStock}
                    className="h-8 w-8 rounded-full border border-border font-bold disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4 font-bold">
            <span>סה"כ</span>
            <span>₪{cartTotal}</span>
          </div>
          <button
            onClick={() => {
              setCartOpen(false);
              setCheckoutOpen(true);
            }}
            disabled={cart.length === 0}
            className="mt-4 w-full rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-40"
          >
            המשך להזמנה
          </button>
        </DialogContent>
      </Dialog>

      {/* Checkout dialog */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>פרטי הזמנה</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCheckout} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-bold">שם מלא</label>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                className="w-full rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-bold">טלפון</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="05XXXXXXXX"
                required
                className="w-full rounded-xl border border-border bg-card px-4 py-3 outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4 font-bold">
              <span>סה"כ לתשלום</span>
              <span>₪{cartTotal}</span>
            </div>
            {formError && <p className="text-sm font-bold text-destructive">{formError}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50"
            >
              {submitting ? "שולח..." : "שליחת הזמנה"}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Order success dialog */}
      <Dialog open={orderSuccess} onOpenChange={setOrderSuccess}>
        <DialogContent className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary">
            <Check size={32} />
          </div>
          <DialogHeader>
            <DialogTitle className="text-center">ההזמנה נשלחה בהצלחה!</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">ניצור איתך קשר בהקדם לתיאום התשלום והמסירה.</p>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
