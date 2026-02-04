import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Eye, EyeOff, Zap } from 'lucide-react';
import { DetectedObject, drawBoundingBoxes, removeBackground, loadImage } from '@/lib/ai-utils';
import { useToast } from '@/hooks/use-toast';
import { useRef } from 'react';

interface DetectionResultsProps {
  image: File;
  objects: DetectedObject[];
  isLoading?: boolean;
}


export const DetectionResults = ({ image, objects, isLoading }: DetectionResultsProps) => {
  const [showBoxes, setShowBoxes] = useState(true);
  const [isRemovingBackground, setIsRemovingBackground] = useState(false);
  const { toast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null); // <-- add this


  const downloadAnnotatedImage = () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `detected_${image.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };




  const handleRemoveBackground = async () => {
    setIsRemovingBackground(true);
    try {
      const imageElement = await loadImage(image);
      const blob = await removeBackground(imageElement);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `no_bg_${image.name.replace(/\.[^/.]+$/, '')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success!",
        description: "Background removed and downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove background",
        variant: "destructive",
      });
    } finally {
      setIsRemovingBackground(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6 bg-card/50 border-primary/20">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Zap className="w-6 h-6 text-primary animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Analyzing Image...</h3>
            <p className="text-muted-foreground">
              AI is detecting objects in your image
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Image Display */}
      <Card className="p-6 bg-card/50 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Detection Results</h3>
          <div className="flex gap-2">
            <Button
              variant="glow"
              size="sm"
              onClick={() => setShowBoxes(!showBoxes)}
            >
              {showBoxes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showBoxes ? 'Hide Boxes' : 'Show Boxes'}
            </Button>
            <Button variant="gradient" size="sm" onClick={downloadAnnotatedImage}>
              <Download className="w-4 h-4" />
              Download
            </Button>
          </div>
        </div>

        <div className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center overflow-hidden relative">
          <ImageWithBoxes
            image={image}
            objects={objects}
            showBoxes={showBoxes}
            canvasRef={canvasRef}
          />
        </div>
      </Card>

      {/* Objects List */}
      <Card className="p-6 bg-card/50 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            Detected Objects ({objects.length})
          </h3>
          <Button
            variant="gradient"
            onClick={handleRemoveBackground}
            disabled={isRemovingBackground}
          >
            <Zap className="w-4 h-4" />
            {isRemovingBackground ? 'Removing...' : 'Remove Background'}
          </Button>
        </div>

        <div className="space-y-3">
          {objects.map((obj, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded border-2"
                  style={{
                    backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%, 0.2)`,
                    borderColor: `hsl(${(index * 60) % 360}, 70%, 50%)`
                  }}
                />
                <span className="font-medium capitalize">{obj.label}</span>
              </div>
              <Badge variant="secondary">
                {Math.round(obj.score * 100)}% confident
              </Badge>
            </div>
          ))}
        </div>

        {objects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No objects detected in this image
          </div>
        )}
      </Card>
    </div>
  );
};

// Component to display image with optional bounding boxes



const ImageWithBoxes = ({ image, objects, showBoxes, canvasRef }: {
  image: File;
  objects: DetectedObject[];
  showBoxes: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) => {


  useEffect(() => {
    let isMounted = true;

    const draw = async () => {
      const img = await loadImage(image);
      if (!isMounted || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size to image size
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw bounding boxes if enabled
      if (showBoxes && objects.length > 0) {
        ctx.lineWidth = 2;
        ctx.font = '18px Arial';
        ctx.textBaseline = 'top';

        objects.forEach((obj, index) => {
          const color = `hsl(${(index * 60) % 360}, 70%, 50%)`;

          // Draw box
          ctx.strokeStyle = color;
          ctx.strokeRect(
            obj.box.xmin,
            obj.box.ymin,
            obj.box.xmax - obj.box.xmin,
            obj.box.ymax - obj.box.ymin
          );

          // Label text
          const text = `${obj.label} (${Math.round(obj.score * 100)}%)`;
          const textWidth = ctx.measureText(text).width;
          const textHeight = 18;

          // Default position: above the box
          let textY = obj.box.ymin - textHeight;
          if (textY < 0) {
            // If out of bounds, place below
            textY = obj.box.ymax;
          }

          // Prevent going outside canvas horizontally
          let textX = obj.box.xmin;
          if (textX + textWidth + 4 > canvas.width) {
            textX = canvas.width - (textWidth + 4);
          }
          if (textX < 0) textX = 0;

          // Draw background
          ctx.fillStyle = color;
          ctx.fillRect(textX, textY, textWidth + 4, textHeight);

          // Draw text
          ctx.fillStyle = "#fff";
          ctx.fillText(text, textX + 2, textY);

        });
      }
    };

    draw();

    return () => {
      isMounted = false;
    };
  }, [image, objects, showBoxes]);

  return (
    <canvas
      ref={canvasRef}
      className="max-w-full max-h-full object-contain rounded-lg"
    />
  );
};

