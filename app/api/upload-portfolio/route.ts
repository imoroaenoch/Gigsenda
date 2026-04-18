import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getAdminDb } from "@/lib/admin-db";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const uid  = formData.get("uid")  as string | null;

    if (!file || !uid) {
      return NextResponse.json({ error: "Missing file or uid" }, { status: 400 });
    }
    if (!file.type.startsWith("image/") && file.type !== "") {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be smaller than 5MB." }, { status: 400 });
    }

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const downloadURL = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:        `portfolioPhotos/${uid}`,
          public_id:     `portfolio_${uid}_${Date.now()}`,
          resource_type: "image",
          transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
          resolve(result.secure_url);
        }
      );
      stream.end(buffer);
    });

    const adminDb = getAdminDb();
    await adminDb.doc(`providers/${uid}`).update({
      portfolioPhotos: FieldValue.arrayUnion(downloadURL),
      updatedAt: new Date(),
    });

    return NextResponse.json({ downloadURL });
  } catch (error: any) {
    console.error("[API/upload-portfolio] Error:", error);
    return NextResponse.json({ error: error.message || "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { uid, url } = await req.json();
    if (!uid || !url) {
      return NextResponse.json({ error: "Missing uid or url" }, { status: 400 });
    }

    const adminDb = getAdminDb();
    await adminDb.doc(`providers/${uid}`).update({
      portfolioPhotos: FieldValue.arrayRemove(url),
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API/upload-portfolio] Delete error:", error);
    return NextResponse.json({ error: error.message || "Delete failed" }, { status: 500 });
  }
}
