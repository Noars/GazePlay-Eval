
export interface EvalFile {
  id: string;
  file: File | Blob;
  type: 'image' | 'sound' | 'video';
  uploadedAt: Date;
}
