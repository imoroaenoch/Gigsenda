import { NextRequest, NextResponse } from "next/server";
import { getPaystackSecret } from "@/lib/paystack-config";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const accountNumber = searchParams.get("account_number");
  const bankCode = searchParams.get("bank_code");

  if (!accountNumber || !bankCode) {
    return NextResponse.json({ error: "account_number and bank_code are required" }, { status: 400 });
  }

  try {
    const secret = await getPaystackSecret();
    const response = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      {
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      return NextResponse.json(
        { success: false, error: data.message || "Account not found. Please check your details." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      accountName: data.data.account_name,
    });
  } catch (error) {
    console.error("resolve-account error:", error);
    return NextResponse.json({ success: false, error: "Failed to verify account. Please try again." }, { status: 500 });
  }
}
