export interface EvalFile {
  id: string;
  file: File | Blob;
  type: 'image' | 'sound' | 'video';
  lastEdit: Date;
}
