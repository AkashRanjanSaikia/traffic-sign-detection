import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ImageUpload } from '@/components/ImageUpload';
import { DetectionResults } from '@/components/DetectionResults';

import { useToast } from '@/hooks/use-toast';
import { Brain, Zap, Eye, Wand2 } from 'lucide-react';

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
const Index = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [detectionResults, setDetectionResults] = useState<DetectedObject[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleImageSelect = async (file: File) => {
    setSelectedImage(file);
    setDetectionResults([]);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/detect", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("API request failed");

      const objects: DetectedObject[] = await res.json();
      setDetectionResults(objects);

      toast({
        title: "Analysis Complete!",
        description: `Found ${objects.length} objects in your image`,
      });
    } catch (error) {
      console.error("Detection error:", error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };


  const handleClearImage = () => {
    setSelectedImage(null);
    setDetectionResults([]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">AI-Powered Vision</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-foreground via-primary to-accent bg-clip-text text-transparent">
              Traffic Signals Detection
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Upload any image and watch our AI identify traffic signals with precision.
              Get instant analysis, bounding boxes, and confidence scores.

            </p>

            <div className="flex items-center justify-center gap-8 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="w-4 h-4 text-primary" />
                Real-time Detection
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="w-4 h-4 text-primary" />
                Background Removal
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wand2 className="w-4 h-4 text-primary" />
                AI Enhancement
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Upload Section */}
          <section>
            <ImageUpload
              onImageSelect={handleImageSelect}
              selectedImage={selectedImage || undefined}
              onClearImage={handleClearImage}
            />
          </section>

          {/* Results Section */}
          {(selectedImage || isAnalyzing) && (
            <>
              <Separator className="bg-primary/20" />
              <section>
                {selectedImage && (
                  <DetectionResults
                    image={selectedImage}
                    objects={detectionResults}
                    isLoading={isAnalyzing}
                  />
                )}
              </section>
            </>
          )}

          {/* Features Info */}
          {!selectedImage && (
            <section className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 bg-card/50 border-primary/20 hover:border-primary/40 transition-all duration-300">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Eye className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Traffic Signal Detection</h3>
                  <p className="text-muted-foreground text-sm">
                    Advanced AI identifies and locates traffic signals with confidence scores and precise bounding boxes.
                  </p>
                </div>
              </Card>

              <Card className="p-6 bg-card/50 border-primary/20 hover:border-primary/40 transition-all duration-300">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Wand2 className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Background Removal</h3>
                  <p className="text-muted-foreground text-sm">
                    One-click background removal using state-of-the-art image segmentation technology.
                  </p>
                </div>
              </Card>

              <Card className="p-6 bg-card/50 border-primary/20 hover:border-primary/40 transition-all duration-300">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Zap className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">Instant Results</h3>
                  <p className="text-muted-foreground text-sm">
                    Fast processing with WebGPU acceleration for real-time analysis and immediate results.
                  </p>
                </div>
              </Card>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
