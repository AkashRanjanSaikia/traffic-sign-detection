import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;
env.useBrowserCache = false;

const MAX_IMAGE_DIMENSION = 1024;

// Object detection interface
export interface DetectedObject {
  label: string;
  score: number;
  box: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}

// Load image from file
export const loadImage = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Resize image if needed
function resizeImageIfNeeded(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, image: HTMLImageElement) {
  let width = image.naturalWidth;
  let height = image.naturalHeight;

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
      width = MAX_IMAGE_DIMENSION;
    } else {
      width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
      height = MAX_IMAGE_DIMENSION;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(image, 0, 0, width, height);
    return true;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0);
  return false;
}

// Object detection function
export const detectObjects = async (imageElement: HTMLImageElement): Promise<DetectedObject[]> => {
  try {
    console.log('Starting object detection...');
    const detector = await pipeline('object-detection', 'Xenova/detr-resnet-50', {
      device: 'webgpu',
    });

    // Convert HTMLImageElement to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Resize image if needed and draw it to canvas
    resizeImageIfNeeded(canvas, ctx, imageElement);
    
    // Get image data as base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    
    // Process the image with the object detection model
    console.log('Processing with object detection model...');
    const result = await detector(imageData);
    
    console.log('Detection result:', result);
    
    return result.map((detection: any) => ({
      label: detection.label,
      score: detection.score,
      box: detection.box
    }));
  } catch (error) {
    console.error('Error detecting objects:', error);
    throw error;
  }
};

// Background removal function
export const removeBackground = async (imageElement: HTMLImageElement): Promise<Blob> => {
  try {
    console.log('Starting background removal process...');
    const segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', {
      device: 'webgpu',
    });
    
    // Convert HTMLImageElement to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Could not get canvas context');
    
    // Resize image if needed and draw it to canvas
    const wasResized = resizeImageIfNeeded(canvas, ctx, imageElement);
    console.log(`Image ${wasResized ? 'was' : 'was not'} resized. Final dimensions: ${canvas.width}x${canvas.height}`);
    
    // Get image data as base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    console.log('Image converted to base64');
    
    // Process the image with the segmentation model
    console.log('Processing with segmentation model...');
    const result = await segmenter(imageData);
    
    console.log('Segmentation result:', result);
    
    if (!result || !Array.isArray(result) || result.length === 0 || !result[0].mask) {
      throw new Error('Invalid segmentation result');
    }
    
    // Create a new canvas for the masked image
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width = canvas.width;
    outputCanvas.height = canvas.height;
    const outputCtx = outputCanvas.getContext('2d');
    
    if (!outputCtx) throw new Error('Could not get output canvas context');
    
    // Draw original image
    outputCtx.drawImage(canvas, 0, 0);
    
    // Apply the mask
    const outputImageData = outputCtx.getImageData(
      0, 0,
      outputCanvas.width,
      outputCanvas.height
    );
    const data = outputImageData.data;
    
    // Apply inverted mask to alpha channel
    for (let i = 0; i < result[0].mask.data.length; i++) {
      // Invert the mask value (1 - value) to keep the subject instead of the background
      const alpha = Math.round((1 - result[0].mask.data[i]) * 255);
      data[i * 4 + 3] = alpha;
    }
    
    outputCtx.putImageData(outputImageData, 0, 0);
    console.log('Mask applied successfully');
    
    // Convert canvas to blob
    return new Promise((resolve, reject) => {
      outputCanvas.toBlob(
        (blob) => {
          if (blob) {
            console.log('Successfully created final blob');
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/png',
        1.0
      );
    });
  } catch (error) {
    console.error('Error removing background:', error);
    throw error;
  }
};

// Draw bounding boxes on image
export const drawBoundingBoxes = (
  imageElement: HTMLImageElement, 
  objects: DetectedObject[]
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  
  canvas.width = imageElement.naturalWidth;
  canvas.height = imageElement.naturalHeight;
  
  // Draw the original image
  ctx.drawImage(imageElement, 0, 0);
  
  // Draw bounding boxes
  objects.forEach((obj, index) => {
    const { xmin, ymin, xmax, ymax } = obj.box;
    
    // Scale coordinates to image dimensions
    const x = xmin * canvas.width;
    const y = ymin * canvas.height;
    const width = (xmax - xmin) * canvas.width;
    const height = (ymax - ymin) * canvas.height;
    
    // Set box style
    ctx.strokeStyle = `hsl(${(index * 60) % 360}, 70%, 50%)`;
    ctx.lineWidth = 3;
    ctx.fillStyle = `hsl(${(index * 60) % 360}, 70%, 50%, 0.2)`;
    
    // Draw box
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
    
    // Draw label
    ctx.fillStyle = `hsl(${(index * 60) % 360}, 70%, 50%)`;
    ctx.font = '16px Inter, sans-serif';
    const label = `${obj.label} (${Math.round(obj.score * 100)}%)`;
    const metrics = ctx.measureText(label);
    
    // Label background
    ctx.fillStyle = `hsl(${(index * 60) % 360}, 70%, 50%)`;
    ctx.fillRect(x, y - 25, metrics.width + 10, 25);
    
    // Label text
    ctx.fillStyle = 'white';
    ctx.fillText(label, x + 5, y - 8);
  });
  
  return canvas;
};
