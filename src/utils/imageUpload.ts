import { FIELD_LIMITS } from '../types/report';

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo de imagen.'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('El archivo seleccionado no es una imagen válida.'));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an uploaded agency or client PNG logo while preserving alpha transparency
 * so it stays crisp and comfortably below Firestore document limits.
 */
export async function compressLogoPng(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecciona un archivo de imagen PNG, WebP o JPG.');
  }

  const img = await loadImageFromFile(file);
  const maxWidth = 360;
  const maxHeight = 140;

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Tu navegador no permite procesar la imagen.');
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let dataUrl = canvas.toDataURL('image/png');
  if (dataUrl.length > FIELD_LIMITS.logoDataUrl) {
    // Retry at smaller dimensions if PNG is unusually complex
    canvas.width = Math.max(1, Math.round(width * 0.65));
    canvas.height = Math.max(1, Math.round(height * 0.65));
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL('image/png');
  }

  if (dataUrl.length > FIELD_LIMITS.logoDataUrl) {
    dataUrl = canvas.toDataURL('image/webp', 0.85);
  }

  if (dataUrl.length > FIELD_LIMITS.logoDataUrl) {
    throw new Error('El logotipo es demasiado pesado. Intenta con un PNG más ligero.');
  }

  return dataUrl;
}

/**
 * Compresses featured post thumbnails to fit up to 6 posts comfortably inside a single Firestore report.
 */
export async function compressPostImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecciona una imagen válida para la publicación.');
  }

  const img = await loadImageFromFile(file);
  const maxWidth = 640;
  const maxHeight = 480;

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Tu navegador no permite procesar la imagen.');
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.78;
  let dataUrl = canvas.toDataURL('image/jpeg', quality);
  while (dataUrl.length > FIELD_LIMITS.postImageUrl && quality > 0.35) {
    quality -= 0.12;
    dataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  if (dataUrl.length > FIELD_LIMITS.postImageUrl) {
    throw new Error('La imagen de la publicación excede el límite permitido. Usa una imagen más compacta.');
  }

  return dataUrl;
}
