import { useEffect, useRef, useState } from "react";
import { DxfViewer as DxfViewerLib } from "dxf-viewer";

interface Props {
  /** DXF file as Blob (from upload or storage download). */
  blob: Blob;
  /** Optional className for container styling. */
  className?: string;
  /** Background color in hex (default white). */
  background?: number;
}

export function DxfViewer({ blob, className, background = 0xffffff }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<DxfViewerLib | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    setError(null);
    setLoading(true);

    let cancelled = false;
    let viewer: DxfViewerLib;
    let objectUrl: string | null = null;

    try {
      viewer = new DxfViewerLib(el, {
        clearColor: background,
        autoResize: true,
        canvasAlpha: false,
        canvasPremultipliedAlpha: false,
      });
      viewerRef.current = viewer;
    } catch (e) {
      setError(`Falha ao inicializar viewer (WebGL?): ${(e as Error).message}`);
      setLoading(false);
      return;
    }

    objectUrl = URL.createObjectURL(blob);
    viewer
      .Load({ url: objectUrl, fonts: [] })
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(
            `Falha ao carregar DXF: ${
              e instanceof Error ? e.message : String(e)
            }`,
          );
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      try {
        viewer.Destroy();
      } catch {
        // viewer may already be torn down
      }
      viewerRef.current = null;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [blob, background]);

  return (
    <div
      className={className ?? "relative h-[600px] w-full rounded-md border bg-white"}
    >
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-muted-foreground">
          Carregando DXF…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-red-50 p-4 text-center text-sm text-red-700">
          {error}
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
