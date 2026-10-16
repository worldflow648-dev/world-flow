import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppSettings, useUpdateAppSetting } from '@/hooks/useAppSettings';
import { toast } from '@/hooks/use-toast';
import { FileText, Info, Save, Wallet, Phone, HelpCircle, Plus, Trash2, ArrowUp, ArrowDown, Settings2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface FaqItem {
  question: string;
  answer: string;
}

const DEFAULT_FAQS: FaqItem[] = [
  { question: 'كيف أسجل كتاجر؟', answer: 'يمكنك التسجيل عبر صفحة إنشاء الحساب باستخدام مفتاح التفعيل الخاص بك.' },
  { question: 'كيف أتابع طلبي؟', answer: 'يمكنك متابعة حالة طلبك من صفحة "طلباتي" في التطبيق.' },
  { question: 'ما هي طرق الدفع المتاحة؟', answer: 'نقبل الدفع عند الاستلام وكذلك الدفع الإلكتروني.' },
  { question: 'كيف أتواصل مع الدعم؟', answer: 'يمكنك التواصل معنا عبر واتساب أو البريد الإلكتروني من صفحة المساعدة.' },
  { question: 'هل يمكنني إلغاء طلبي؟', answer: 'نعم، يمكنك إلغاء الطلب قبل أن يتم شحنه.' },
];

const AdminContentPages = () => {
  const { data: settings, isLoading } = useAppSettings();
  const updateSetting = useUpdateAppSetting();

  const [privacyDraft, setPrivacyDraft] = useState<string | null>(null);
  const [aboutDraft, setAboutDraft] = useState<string | null>(null);
  const [qiCardNumberDraft, setQiCardNumberDraft] = useState<string | null>(null);
  const [qiCardNameDraft, setQiCardNameDraft] = useState<string | null>(null);
  const [asiacellPhoneDraft, setAsiacellPhoneDraft] = useState<string | null>(null);
  const [asiacellNameDraft, setAsiacellNameDraft] = useState<string | null>(null);
  const [faqDraft, setFaqDraft] = useState<FaqItem[] | null>(null);

  const qiCardNumberValue = qiCardNumberDraft ?? settings?.qi_card_number ?? '';
  const qiCardNameValue = qiCardNameDraft ?? settings?.qi_card_name ?? '';
  const asiacellPhoneValue = asiacellPhoneDraft ?? settings?.asiacell_phone_number ?? '';
  const asiacellNameValue = asiacellNameDraft ?? settings?.asiacell_holder_name ?? '';
  const privacyValue = privacyDraft ?? settings?.privacy_policy ?? '';
  const aboutValue = aboutDraft ?? settings?.about_app ?? '';

  const parsedDbFaqs = (): FaqItem[] | null => {
    if (!settings?.faqs) return null;
    try { return JSON.parse(settings.faqs); } catch { return null; }
  };

  const faqItems: FaqItem[] = faqDraft ?? parsedDbFaqs() ?? DEFAULT_FAQS;

  const handleSave = (key: string, value: string, label: string) => {
    updateSetting.mutate(
      { key, value },
      {
        onSuccess: () => {
          toast({ title: '✅ تم الحفظ', description: `تم تحديث ${label}` });
          if (key === 'privacy_policy') setPrivacyDraft(null);
          if (key === 'about_app') setAboutDraft(null);
        },
        onError: () => {
          toast({ title: 'خطأ', description: 'فشل في الحفظ', variant: 'destructive' });
        },
      }
    );
  };

  const handleSavePaymentMethods = () => {
    if (qiCardNumberValue && (qiCardNumberValue.length < 10 || qiCardNumberValue.length > 12)) {
      toast({ title: 'خطأ', description: 'رقم البطاقة يجب أن يكون بين 10 و 12 خانة', variant: 'destructive' });
      return;
    }
    updateSetting.mutate({ key: 'qi_card_number', value: qiCardNumberValue }, {
      onSuccess: () => {
        updateSetting.mutate({ key: 'qi_card_name', value: qiCardNameValue }, {
          onSuccess: () => {
            updateSetting.mutate({ key: 'asiacell_phone_number', value: asiacellPhoneValue }, {
              onSuccess: () => {
                updateSetting.mutate({ key: 'asiacell_holder_name', value: asiacellNameValue }, {
                  onSuccess: () => {
                    toast({ title: '✅ تم الحفظ', description: 'تم تحديث طرق الدفع' });
                    setQiCardNumberDraft(null); setQiCardNameDraft(null);
                    setAsiacellPhoneDraft(null); setAsiacellNameDraft(null);
                  },
                  onError: () => toast({ title: 'خطأ', description: 'فشل في الحفظ', variant: 'destructive' }),
                });
              },
              onError: () => toast({ title: 'خطأ', description: 'فشل في الحفظ', variant: 'destructive' }),
            });
          },
          onError: () => toast({ title: 'خطأ', description: 'فشل في الحفظ', variant: 'destructive' }),
        });
      },
      onError: () => toast({ title: 'خطأ', description: 'فشل في الحفظ', variant: 'destructive' }),
    });
  };

  const handleSaveFaqs = () => {
    const json = JSON.stringify(faqItems);
    updateSetting.mutate(
      { key: 'faqs', value: json },
      {
        onSuccess: () => {
          toast({ title: '✅ تم الحفظ', description: 'تم تحديث الأسئلة الشائعة' });
          setFaqDraft(null);
        },
        onError: () => toast({ title: 'خطأ', description: 'فشل في الحفظ', variant: 'destructive' }),
      }
    );
  };

  const updateFaq = (index: number, field: 'question' | 'answer', value: string) => {
    const updated = [...faqItems];
    updated[index] = { ...updated[index], [field]: value };
    setFaqDraft(updated);
  };

  const addFaq = () => setFaqDraft([...faqItems, { question: '', answer: '' }]);

  const removeFaq = (index: number) => {
    const updated = faqItems.filter((_, i) => i !== index);
    setFaqDraft(updated);
  };

  const moveFaq = (index: number, direction: 'up' | 'down') => {
    const updated = [...faqItems];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= updated.length) return;
    [updated[index], updated[target]] = [updated[target], updated[index]];
    setFaqDraft(updated);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-4" dir="rtl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <FileText className="w-7 h-7 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">صفحات المحتوى</h1>
      </div>

      <Tabs defaultValue="privacy" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="privacy" className="gap-2">
            <FileText className="w-4 h-4" />
            سياسة الخصوصية
          </TabsTrigger>
          <TabsTrigger value="about" className="gap-2">
            <Info className="w-4 h-4" />
            حول التطبيق
          </TabsTrigger>
          <TabsTrigger value="payment-methods" className="gap-2">
            <Wallet className="w-4 h-4" />
            طرق الدفع
          </TabsTrigger>
          <TabsTrigger value="faqs" className="gap-2">
            <HelpCircle className="w-4 h-4" />
            الأسئلة الشائعة
          </TabsTrigger>
          <TabsTrigger value="store-settings" className="gap-2">
            <Settings2 className="w-4 h-4" />
            إعدادات المتجر
          </TabsTrigger>
        </TabsList>

        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">سياسة الخصوصية</CardTitle>
              <p className="text-sm text-muted-foreground">اكتب أو عدّل سياسة الخصوصية التي ستظهر للمستخدمين</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={privacyValue}
                onChange={e => setPrivacyDraft(e.target.value)}
                placeholder="اكتب سياسة الخصوصية هنا..."
                className="min-h-[300px] leading-relaxed"
                dir="rtl"
              />
              <Button
                onClick={() => handleSave('privacy_policy', privacyValue, 'سياسة الخصوصية')}
                disabled={updateSetting.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {updateSetting.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="about">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">حول التطبيق</CardTitle>
              <p className="text-sm text-muted-foreground">اكتب وصف التطبيق الذي سيظهر في صفحة "حول التطبيق"</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={aboutValue}
                onChange={e => setAboutDraft(e.target.value)}
                placeholder="اكتب وصف التطبيق هنا..."
                className="min-h-[300px] leading-relaxed"
                dir="rtl"
              />
              <Button
                onClick={() => handleSave('about_app', aboutValue, 'حول التطبيق')}
                disabled={updateSetting.isPending}
                className="gap-2"
              >
                <Save className="w-4 h-4" />
                {updateSetting.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment-methods">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">طرق الدفع</CardTitle>
              <p className="text-sm text-muted-foreground">أدخل معلومات طرق الدفع التي سيقوم التجار بالإيداع عليها</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-base flex items-center gap-2 text-foreground">
                  <Wallet className="w-5 h-5 text-primary" />
                  بطاقة Qi
                </h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم البطاقة</label>
                  <Input
                    value={qiCardNumberValue}
                    onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 12); setQiCardNumberDraft(val); }}
                    placeholder="أدخل رقم البطاقة (10-12 رقم)"
                    dir="ltr"
                    className="font-mono text-lg tracking-wider"
                    maxLength={12}
                  />
                  {qiCardNumberValue && (qiCardNumberValue.length < 10 || qiCardNumberValue.length > 12) && (
                    <p className="text-xs text-destructive">يجب أن يكون الرقم بين 10 و 12 خانة</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">اسم صاحب البطاقة</label>
                  <Input value={qiCardNameValue} onChange={e => setQiCardNameDraft(e.target.value)} placeholder="أدخل اسم صاحب البطاقة" />
                </div>
              </div>
              <div className="h-px bg-border" />
              <div className="space-y-4">
                <h3 className="font-semibold text-base flex items-center gap-2 text-foreground">
                  <Phone className="w-5 h-5 text-primary" />
                  تحويل آسيا سيل
                </h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم الهاتف</label>
                  <Input
                    value={asiacellPhoneValue}
                    onChange={e => { const val = e.target.value.replace(/\D/g, '').slice(0, 11); setAsiacellPhoneDraft(val); }}
                    placeholder="أدخل رقم هاتف آسيا سيل"
                    dir="ltr"
                    className="font-mono text-lg tracking-wider"
                    maxLength={11}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">اسم صاحب الرقم</label>
                  <Input value={asiacellNameValue} onChange={e => setAsiacellNameDraft(e.target.value)} placeholder="أدخل اسم صاحب الرقم" />
                </div>
              </div>
              <Button onClick={handleSavePaymentMethods} disabled={updateSetting.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {updateSetting.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faqs">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الأسئلة الشائعة</CardTitle>
              <p className="text-sm text-muted-foreground">أضف أو عدّل الأسئلة الشائعة التي ستظهر في صفحة المساعدة</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {faqItems.map((faq, index) => (
                <div key={index} className="border border-border rounded-xl p-4 space-y-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">سؤال {index + 1}</span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveFaq(index, 'up')} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveFaq(index, 'down')} disabled={index === faqItems.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeFaq(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    value={faq.question}
                    onChange={e => updateFaq(index, 'question', e.target.value)}
                    placeholder="اكتب السؤال..."
                    dir="rtl"
                  />
                  <Textarea
                    value={faq.answer}
                    onChange={e => updateFaq(index, 'answer', e.target.value)}
                    placeholder="اكتب الإجابة..."
                    dir="rtl"
                    className="min-h-[80px]"
                  />
                </div>
              ))}

              <Button variant="outline" onClick={addFaq} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                إضافة سؤال جديد
              </Button>

              <Button onClick={handleSaveFaqs} disabled={updateSetting.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {updateSetting.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="store-settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إعدادات المتجر</CardTitle>
              <p className="text-sm text-muted-foreground">تحكم في إعدادات التسعير والطلبات</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                <div className="space-y-1">
                  <p className="font-medium text-foreground">السماح بالتسعير أقل من سعر التاجر</p>
                  <p className="text-sm text-muted-foreground">إذا كان مفعّلاً، يمكن للتاجر وضع سعر بيع أقل من سعر التكلفة كهدية أو خصم</p>
                </div>
                <Switch
                  checked={(settings?.allow_below_cost_pricing ?? 'true') === 'true'}
                  onCheckedChange={(checked) => {
                    updateSetting.mutate(
                      { key: 'allow_below_cost_pricing', value: checked ? 'true' : 'false' },
                      {
                        onSuccess: () => toast({ title: '✅ تم الحفظ', description: checked ? 'تم تفعيل التسعير الحر' : 'تم تقييد التسعير' }),
                        onError: () => toast({ title: 'خطأ', description: 'فشل في الحفظ', variant: 'destructive' }),
                      }
                    );
                  }}
                  disabled={updateSetting.isPending}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminContentPages;
