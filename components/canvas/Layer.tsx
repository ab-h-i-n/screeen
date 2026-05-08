"use client";

import { ClockRenderer } from "@/components/renderers/ClockRenderer";
import { CountdownRenderer } from "@/components/renderers/CountdownRenderer";
import { IframeHtmlRenderer } from "@/components/renderers/IframeHtmlRenderer";
import { ImageRenderer } from "@/components/renderers/ImageRenderer";
import { QrRenderer } from "@/components/renderers/QrRenderer";
import { StreamRenderer } from "@/components/renderers/StreamRenderer";
import { TextRenderer } from "@/components/renderers/TextRenderer";
import { TodoRenderer } from "@/components/renderers/TodoRenderer";
import { VideoRenderer } from "@/components/renderers/VideoRenderer";
import { WeatherRenderer } from "@/components/renderers/WeatherRenderer";
import { WebsiteRenderer } from "@/components/renderers/WebsiteRenderer";
import type { Content, Layer as LayerDoc } from "@/components/renderers/types";

export interface LayerProps {
  layer: LayerDoc;
  content: Content | null;
  isAdmin?: boolean;
}

export function Layer({ layer, content, isAdmin }: LayerProps) {
  if (!content) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-rose-100 text-xs text-rose-700">
        Missing content
      </div>
    );
  }
  const overrides = layer.overrides ?? null;
  switch (content.type) {
    case "text":
      return (
        <TextRenderer payload={content.payload} overrides={overrides} isAdmin={isAdmin} />
      );
    case "website":
      return (
        <WebsiteRenderer
          payload={content.payload}
          overrides={overrides}
          isAdmin={isAdmin}
        />
      );
    case "image":
      return (
        <ImageRenderer payload={content.payload} overrides={overrides} isAdmin={isAdmin} />
      );
    case "video":
      return (
        <VideoRenderer payload={content.payload} overrides={overrides} isAdmin={isAdmin} />
      );
    case "clock":
      return (
        <ClockRenderer payload={content.payload} overrides={overrides} isAdmin={isAdmin} />
      );
    case "todo":
      return (
        <TodoRenderer payload={content.payload} overrides={overrides} isAdmin={isAdmin} />
      );
    case "stream":
      return (
        <StreamRenderer
          payload={content.payload}
          overrides={overrides}
          isAdmin={isAdmin}
        />
      );
    case "countdown":
      return (
        <CountdownRenderer
          payload={content.payload}
          overrides={overrides}
          isAdmin={isAdmin}
        />
      );
    case "qr":
      return (
        <QrRenderer payload={content.payload} overrides={overrides} isAdmin={isAdmin} />
      );
    case "weather":
      return (
        <WeatherRenderer
          payload={content.payload}
          overrides={overrides}
          isAdmin={isAdmin}
        />
      );
    case "iframe-html":
      return (
        <IframeHtmlRenderer
          payload={content.payload}
          overrides={overrides}
          isAdmin={isAdmin}
        />
      );
    default:
      return null;
  }
}
