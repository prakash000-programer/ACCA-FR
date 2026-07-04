import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { TopBar } from "@/components/mobile/TopBar";
import { Bookmark, MessageSquare, ChevronLeft, ChevronRight, Sparkles, Award } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ScreenSecurity } from "@/plugins/ScreenSecurity";

export const Route = createFileRoute("/notes/$id")({
  component: () => {
    const { id } = Route.useParams();
    return <PdfViewer key={id} />;
  }
});

function PdfViewer() {
  const { id } = Route.useParams();
  const [marked, setMarked] = useState(false);
  const [content, setContent] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [linkedQuizId, setLinkedQuizId] = useState<string | null>(null);

  // PDF.js State
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [renderingPage, setRenderingPage] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [initialDist, setInitialDist] = useState<number | null>(null);
  const [baseScale, setBaseScale] = useState(1.0);
  const loadedIdRef = useRef<string | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      setInitialDist(dist);
      setBaseScale(zoomScale);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialDist !== null) {
      if (e.cancelable) e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / initialDist;
      const newScale = Math.min(Math.max(baseScale * factor, 1.0), 3.0);
      setZoomScale(newScale);
    }
  };

  const handleTouchEnd = () => {
    setInitialDist(null);
  };

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const showFallback = !isUuid || !pdfUrl;
  const titleText = content?.title || id.toUpperCase().replace(/-/g, " ");

  // Enable screenshot protection when the PDF page is active
  useEffect(() => {
    ScreenSecurity.enableScreenSecurity().catch(() => {});
    return () => {
      // Re-enable screenshots when user leaves this page
      ScreenSecurity.disableScreenSecurity().catch(() => {});
    };
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(`bookmark_${id}`);
    if (saved === "true") {
      setMarked(true);
    }
  }, [id]);

  const handleBookmarkToggle = () => {
    const nextMarked = !marked;
    setMarked(nextMarked);
    if (nextMarked) {
      localStorage.setItem(`bookmark_${id}`, "true");
      toast.success("Added to bookmarks");
    } else {
      localStorage.removeItem(`bookmark_${id}`);
      toast.success("Removed from bookmarks");
    }
  };

  useEffect(() => {
    if (!isUuid) {
      setLoading(false);
      return;
    }

    let active = true;

    const fetchPdf = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("content")
          .select("*")
          .eq("id", id)
          .single();

        if (!active) return;
        if (error) throw error;
        setContent(data);

        if (data && data.topic) {
          const { data: quizData } = await supabase
            .from("quizzes")
            .select("id")
            .eq("topic", data.topic)
            .eq("is_published", true)
            .limit(1);

          if (!active) return;
          if (quizData && quizData.length > 0) {
            setLinkedQuizId(quizData[0].id);
          }
        }

        if (data && data.pdf_path) {
          const { data: signedData, error: signError } = await supabase
            .storage
            .from("acca-pdfs")
            .createSignedUrl(data.pdf_path, 900);

          if (!active) return;
          if (signError) throw signError;
          setPdfUrl(signedData.signedUrl);
        }
      } catch (err: any) {
        if (active) {
          console.error("Error loading content PDF:", err);
          toast.error("Failed to load PDF.");
          
          // Clean up local storage if the note was not found (e.g. database reset/deleted project)
          if (err.code === "PGRST116" || (err.message && err.message.includes("JSON object requested"))) {
            localStorage.removeItem(`pdf_progress_${id}`);
            try {
              const lastReadRaw = localStorage.getItem("pdf_last_read");
              if (lastReadRaw) {
                const lastReadObj = JSON.parse(lastReadRaw);
                if (lastReadObj && lastReadObj.id === id) {
                  localStorage.removeItem("pdf_last_read");
                }
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchPdf();

    return () => {
      active = false;
    };
  }, [id, isUuid]);

  // Load PDF.js library and fetch document
  useEffect(() => {
    if (!isUuid || !pdfUrl) return;

    let active = true;

    const loadAndRender = async () => {
      console.log("[PDF Viewer] Initializing PDF.js, checking library presence...");
      const getPdfjsLib = (): any => (window as any).pdfjsLib;

      // 1. Wait until pdfjsLib is defined on window
      let attempts = 0;
      while (!getPdfjsLib() && attempts < 100) {
        await new Promise((r) => setTimeout(r, 100));
        attempts++;
      }

      // 2. Fallback: dynamically load if not found
      if (!getPdfjsLib()) {
        console.log("[PDF Viewer] Library not found on window, performing fallback injection...");
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
        script.async = true;
        document.body.appendChild(script);

        let subAttempts = 0;
        while (!getPdfjsLib() && subAttempts < 100) {
          await new Promise((r) => setTimeout(r, 100));
          subAttempts++;
        }
      }

      const pdfjsLib = getPdfjsLib();
      if (!pdfjsLib) {
        console.error("[PDF Viewer] PDF.js library failed to load completely.");
        toast.error("Failed to load PDF viewer engine.");
        return;
      }

      console.log("[PDF Viewer] PDF.js engine loaded. Initializing Web Worker...");
      
      try {
        // Load worker script locally via Blob to bypass same-origin Web Worker restrictions
        const workerResponse = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js");
        const workerCode = await workerResponse.text();
        const blob = new Blob([workerCode], { type: "application/javascript" });
        pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
        console.log("[PDF Viewer] Web Worker initialized successfully via Blob URL.");
      } catch (workerErr) {
        console.warn("[PDF Viewer] Failed to load worker via Blob. Falling back to fake worker.", workerErr);
        // Fallback: PDF.js will automatically fall back to single-threaded fake worker
      }

      try {
        console.log("[PDF Viewer] Fetching binary PDF payload to bypass CORS/Range requests...");
        const response = await fetch(pdfUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF payload: HTTP status ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        console.log("[PDF Viewer] PDF payload downloaded successfully. Parsing with PDF.js...");

        const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
        const pdf = await loadingTask.promise;
        
        if (active) {
          console.log("[PDF Viewer] PDF document parsed successfully. Pages:", pdf.numPages);
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          loadedIdRef.current = id;
        }
      } catch (err: any) {
        console.error("[PDF Viewer] Critical error loading/parsing PDF:", err);
        if (active) {
          toast.error(`Failed to parse PDF: ${err.message || "Unknown error"}`);
        }
      }
    };

    loadAndRender();

    return () => {
      active = false;
    };
  }, [pdfUrl, isUuid, id]);

  // Render current page when document or page number changes
  useEffect(() => {
    if (!pdfDoc) return;

    let active = true;
    setRenderingPage(true);

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!active) return;

        const canvas = document.getElementById("pdf-canvas") as HTMLCanvasElement;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        // Render at high resolution scale (2.0) for razor-sharp visual appearance on mobile screens
        const viewport = page.getViewport({ scale: 2.0 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        await page.render(renderContext).promise;
      } catch (err) {
        console.error("Error rendering PDF page:", err);
      } finally {
        if (active) {
          setRenderingPage(false);
        }
      }
    };

    renderPage();

    return () => {
      active = false;
    };
  }, [pdfDoc, pageNum]);



  // Save progress & last read record to localStorage (only increase progress)
  useEffect(() => {
    if (pdfDoc && numPages > 0 && loadedIdRef.current === id) {
      const newProgress = Math.round((pageNum / numPages) * 100);
      
      let existingProgress = 0;
      const saved = localStorage.getItem(`pdf_progress_${id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.progress === "number") {
            existingProgress = parsed.progress;
          }
        } catch (e) {
          console.error(e);
        }
      }
      
      const finalProgress = Math.max(existingProgress, newProgress);
      
      localStorage.setItem(`pdf_progress_${id}`, JSON.stringify({ pageNum, numPages, progress: finalProgress }));
      localStorage.setItem(`pdf_last_read`, JSON.stringify({ id, title: titleText, pageNum, numPages, progress: finalProgress, timestamp: Date.now() }));
    }
  }, [id, pageNum, numPages, titleText, pdfDoc]);

  // Restore previous progress if any
  useEffect(() => {
    const saved = localStorage.getItem(`pdf_progress_${id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.pageNum === "number") {
          setPageNum(parsed.pageNum);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [id]);

  return (
    <MobileFrame bg="bg-card" scrollable={false}>
      <div className="flex flex-col h-full">
        <TopBar
          title={titleText}
          back="/notes"
          right={
            <div className="flex items-center gap-1">
              {linkedQuizId && (
                <Link
                  to="/quiz"
                  search={{ quizId: linkedQuizId }}
                  className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mr-0.5"
                  title="Practice Quiz"
                >
                  <Award size={18} className="text-warning animate-bounce" style={{ animationDuration: '3s' }} />
                </Link>
              )}
              <Link
                to="/chat"
                search={{ from: `/notes/${id}` }}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mr-0.5"
                title="AI Tutor"
              >
                <Sparkles size={18} className="text-primary animate-pulse" />
              </Link>
              <Link
                to="/discussion/$topic"
                params={{ topic: id }}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Discussion"
              >
                <MessageSquare size={18} />
              </Link>
              <button
                onClick={handleBookmarkToggle}
                className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
                title={marked ? "Remove Bookmark" : "Save Bookmark"}
              >
                <Bookmark size={18} className={marked ? "fill-primary text-primary" : "text-muted-foreground"} />
              </button>
            </div>
          }
        />

        <div 
          className="flex-1 overflow-y-auto px-4 py-4 select-none relative z-0 bg-background/20"
          onContextMenu={(e) => e.preventDefault()}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
              <p className="text-sm">Fetching protected file...</p>
            </div>
          ) : showFallback ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <BookOpen size={36} className="text-primary/60 mb-3" />
              <h3 className="font-display font-semibold text-[14px] text-foreground">No content available</h3>
              <p className="text-[12px] text-muted-foreground mt-1 px-4">
                This topic does not have a PDF document uploaded yet.
              </p>
            </div>
          ) : (
            <div 
              className="w-full rounded-lg overflow-auto border border-border bg-background relative z-0 flex justify-center max-h-[72vh]"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {renderingPage && !pdfDoc && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
                  <div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                </div>
              )}
              <div className={`w-full h-full flex items-start overflow-auto p-1 ${zoomScale > 1.0 ? "justify-start" : "justify-center"}`}>
                <canvas 
                  id="pdf-canvas" 
                  className="shadow-sm transition-[width] duration-200" 
                  style={{
                    width: `${zoomScale * 100}%`,
                    maxWidth: "none",
                    height: "auto",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* stable bottom switcher toolbar */}
        {!loading && !showFallback && (
          <div className="shrink-0 bg-card border-t border-border px-4 py-3 flex items-center justify-between z-20 shadow-md">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-2">
              Page {pageNum} / {numPages || "..."}
              {zoomScale > 1.0 && (
                <span className="text-[10px] text-primary bg-primary-light/40 px-1.5 py-0.5 rounded-full font-bold">
                  {Math.round(zoomScale * 100)}%
                </span>
              )}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setPageNum((prev) => Math.max(prev - 1, 1));
                  setZoomScale(1.0); // Reset zoom on page change
                }}
                disabled={pageNum <= 1 || renderingPage}
                className={`h-9 w-9 rounded-lg bg-background border border-border flex items-center justify-center ${pageNum <= 1 || renderingPage ? "opacity-50 cursor-not-allowed" : "hover:bg-accent active:scale-95 transition-all"}`}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => {
                  setPageNum((prev) => Math.min(prev + 1, numPages));
                  setZoomScale(1.0); // Reset zoom on page change
                }}
                disabled={pageNum >= numPages || renderingPage}
                className={`h-9 w-9 rounded-lg bg-background border border-border flex items-center justify-center ${pageNum >= numPages || renderingPage ? "opacity-50 cursor-not-allowed" : "hover:bg-accent active:scale-95 transition-all"}`}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </MobileFrame>
  );
}

