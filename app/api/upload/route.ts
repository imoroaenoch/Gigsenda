import { NextRequest, NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";

export const dynamic = 'force-dynamic';
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key:    process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

// Singleton Firebase Admin for Firestore writes
function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const projectId   = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file   = formData.get("file") as File | null;
    const uid    = formData.get("uid")  as string | null;
    const target = (formData.get("target") as string) || "users";

    if (!file || !uid) {
      return NextResponse.json({ error: "Missing file or uid" }, { status: 400 });
    }

    // Validate
    if (!file.type.startsWith("image/") && file.type !== "") {
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image must be smaller than 5MB." }, { status: 400 });
    }

    console.log("[API/upload] Uploading to Cloudinary for uid:", uid);

    const bytes  = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary using upload_stream
    const downloadURL = await new Promise<string>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder:          `profileImages/${uid}`,
          public_id:       `${uid}_${Date.now()}`,
          resource_type:   "image",
          overwrite:       true,
          transformation:  [{ width: 400, height: 400, crop: "fill", gravity: "face" }],
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
          resolve(result.secure_url);
        }
      );
      stream.end(buffer);
    });

    console.log("[API/upload] Done. URL:", downloadURL);

    // Save to Firestore via Admin SDK
    const adminApp = getAdminApp();
    const { getFirestore } = await import("firebase-admin/firestore");
    const adminDb = getFirestore(adminApp);
    await adminDb.doc(`${target}/${uid}`).update({
      photoURL:  downloadURL,
      updatedAt: new Date(),
    });
    // Also sync to providers collection if the user is a provider
    try {
      const providerRef = adminDb.doc(`providers/${uid}`);
      const providerSnap = await providerRef.get();
      if (providerSnap.exists) {
        await providerRef.update({ photoURL: downloadURL, updatedAt: new Date() });
      }
    } catch {
      // Not a provider — ignore
    }

    return NextResponse.json({ downloadURL });
  } catch (error: any) {
    console.error("[API/upload] Error:", error);
    return NextResponse.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
