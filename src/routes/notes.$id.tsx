import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MobileFrame } from "@/components/mobile/MobileFrame";
import { TopBar } from "@/components/mobile/TopBar";
import { Bookmark, MessageSquare, ChevronLeft, ChevronRight, Sparkles, Award } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ScreenSecurity } from "@/plugins/ScreenSecurity";

export const Route = createFileRoute("/notes/$id")({ component: PdfViewer });

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

    const fetchPdf = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("content")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        setContent(data);

        if (data && data.topic) {
          const { data: quizData } = await supabase
            .from("quizzes")
            .select("id")
            .eq("topic", data.topic)
            .eq("is_published", true)
            .limit(1);

          if (quizData && quizData.length > 0) {
            setLinkedQuizId(quizData[0].id);
          }
        }

        if (data && data.pdf_path) {
          const { data: signedData, error: signError } = await supabase
            .storage
            .from("acca-pdfs")
            .createSignedUrl(data.pdf_path, 900);

          if (signError) throw signError;
          setPdfUrl(signedData.signedUrl);
        }
      } catch (err) {
        console.error("Error loading content PDF:", err);
        toast.error("Failed to load PDF.");
      } finally {
        setLoading(false);
      }
    };

    fetchPdf();
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
  }, [pdfUrl, isUuid]);

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

  // Save progress & last read record to localStorage
  useEffect(() => {
    if (pdfDoc && numPages > 0) {
      const progress = Math.round((pageNum / numPages) * 100);
      localStorage.setItem(`pdf_progress_${id}`, JSON.stringify({ pageNum, numPages, progress }));
      localStorage.setItem(`pdf_last_read`, JSON.stringify({ id, title: titleText, pageNum, numPages, progress, timestamp: Date.now() }));
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
    <MobileFrame bg="bg-card">
      <div className="flex flex-col min-h-[calc(100dvh-28px)] sm:min-h-[calc(844px-28px)]">
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
          className="flex-1 relative p-1 min-h-[60vh] select-none"
          onContextMenu={(e) => e.preventDefault()}
        >

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <div className="h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin mb-4" />
            <p className="text-sm">Fetching protected file...</p>
          </div>
        ) : showFallback ? (
          <article className="relative space-y-4 text-foreground z-0">
            <h2 className="font-display font-bold text-xl">IAS 16 — Property, Plant & Equipment</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              IAS 16 prescribes the accounting treatment for property, plant and equipment (PPE) so that
              users of the financial statements can discern information about an entity's investment in
              its PPE and the changes in such investment.
            </p>

            <h3 className="font-display font-semibold text-base pt-2">Recognition</h3>
            <p className="text-sm leading-relaxed">
              The cost of an item of PPE shall be recognised as an asset if, and only if:
            </p>
            <ul className="text-sm space-y-1.5 pl-4 list-disc marker:text-primary">
              <li>It is probable that future economic benefits will flow to the entity; and</li>
              <li>The cost of the item can be measured reliably.</li>
            </ul>

            <h3 className="font-display font-semibold text-base pt-2">Initial Measurement</h3>
            <p className="text-sm leading-relaxed">
              An item of PPE that qualifies for recognition shall be measured at its cost, including
              purchase price, directly attributable costs, and the initial estimate of dismantling costs.
            </p>

            <div className="rounded-xl bg-primary-light border border-primary/15 p-3 mt-2">
              <p className="text-xs font-display font-semibold text-primary">Exam tip</p>
              <p className="text-xs text-foreground mt-1">
                Subsequent expenditure is capitalised only if it meets the recognition criteria — routine
                maintenance is expensed.
              </p>
            </div>
          </article>
        ) : (
          <div className="w-full rounded-lg overflow-hidden border border-border bg-background relative z-0 flex justify-center">
            {renderingPage && !pdfDoc && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-20">
                <div className="h-6 w-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
              </div>
            )}
            <canvas id="pdf-canvas" className="w-full h-auto max-w-full shadow-sm" />
          </div>
        )}
      </div>



        {/* bottom toolbar */}
        {!loading && !showFallback && (
          <div className="mt-auto bg-card border-t border-border px-4 py-3 flex items-center justify-between z-20">
            <span className="text-xs font-medium text-muted-foreground">
              Page {pageNum} of {numPages || "..."}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPageNum((prev) => Math.max(prev - 1, 1))}
                disabled={pageNum <= 1 || renderingPage}
                className={`h-9 w-9 rounded-lg bg-background border border-border flex items-center justify-center ${pageNum <= 1 || renderingPage ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPageNum((prev) => Math.min(prev + 1, numPages))}
                disabled={pageNum >= numPages || renderingPage}
                className={`h-9 w-9 rounded-lg bg-background border border-border flex items-center justify-center ${pageNum >= numPages || renderingPage ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
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

