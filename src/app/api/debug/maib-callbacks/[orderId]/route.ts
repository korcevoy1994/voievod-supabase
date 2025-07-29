import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = createSupabaseServerClient();
    const { orderId } = await params;

    // Получаем все платежи для этого заказа
    const { data: payments, error: paymentsError } = await supabase
      .from('order_payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return NextResponse.json(
        { error: 'Error fetching payments' },
        { status: 500 }
      );
    }

    // Анализируем данные провайдера для каждого платежа
    const analysisResults = payments?.map(payment => {
      const providerData = payment.provider_data || {};
      
      return {
        paymentId: payment.id,
        providerPaymentId: payment.provider_payment_id,
        status: payment.status,
        amount: payment.amount,
        createdAt: payment.created_at,
        updatedAt: payment.updated_at,
        completedAt: payment.completed_at,
        providerData,
        analysis: {
          hasCallbackData: !!providerData.callbackReceived,
          callbackReceivedAt: providerData.callbackReceived || null,
          maibStatus: providerData.status || null,
          maibStatusCode: providerData.statusCode || null,
          maibStatusMessage: providerData.statusMessage || null,
          maibPayId: providerData.payId || null,
          maibOrderId: providerData.orderId || null,
          maibThreeDs: providerData.threeDs || null,
          maibRrn: providerData.rrn || null,
          maibApproval: providerData.approval || null,
          maibCardNumber: providerData.cardNumber || null,
          maibAmount: providerData.amount || null,
          maibCurrency: providerData.currency || null,
          hasSignature: !!providerData.signature,
          rawCallbackData: providerData.rawCallbackData || null
        }
      };
    }) || [];

    // Общий анализ
    const overallAnalysis = {
      totalPayments: payments?.length || 0,
      paymentsWithCallbacks: analysisResults.filter(p => p.analysis.hasCallbackData).length,
      successfulPayments: analysisResults.filter(p => p.status === 'completed').length,
      failedPayments: analysisResults.filter(p => p.status === 'failed').length,
      pendingPayments: analysisResults.filter(p => p.status === 'pending').length,
      possibleIssues: [] as string[]
    };

    // Определяем возможные проблемы
    if (overallAnalysis.totalPayments === 0) {
      overallAnalysis.possibleIssues.push('Платежи для этого заказа не найдены в базе данных');
    }

    if (overallAnalysis.paymentsWithCallbacks === 0 && overallAnalysis.totalPayments > 0) {
      overallAnalysis.possibleIssues.push('Callback от MAIB не получен ни для одного платежа');
    }

    if (overallAnalysis.pendingPayments > 0) {
      overallAnalysis.possibleIssues.push(`${overallAnalysis.pendingPayments} платеж(ей) в статусе pending - возможно, ожидается callback`);
    }

    analysisResults.forEach((payment, index) => {
      if (payment.analysis.hasCallbackData) {
        if (payment.analysis.maibStatus === 'OK' && payment.status !== 'completed') {
          overallAnalysis.possibleIssues.push(`Платеж #${index + 1}: MAIB вернул статус OK, но платеж не завершен`);
        }
        if (payment.analysis.maibStatus !== 'OK' && payment.status === 'completed') {
          overallAnalysis.possibleIssues.push(`Платеж #${index + 1}: MAIB вернул статус ${payment.analysis.maibStatus}, но платеж завершен`);
        }
        if (payment.analysis.maibStatusCode && payment.analysis.maibStatusCode !== '000') {
          overallAnalysis.possibleIssues.push(`Платеж #${index + 1}: MAIB код ошибки ${payment.analysis.maibStatusCode}: ${payment.analysis.maibStatusMessage}`);
        }
      }
    });

    return NextResponse.json({
      orderId,
      payments: analysisResults,
      analysis: overallAnalysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in MAIB callbacks debug:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}