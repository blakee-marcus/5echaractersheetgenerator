import {
  generateCharacterSheet,
  PdfGenerationError,
} from "../../../../services/pdf-generation";

export const runtime = "nodejs";
export const MAX_REQUEST_BYTES = 256 * 1024;

type PdfGenerator = (input: unknown) => Promise<Uint8Array>;
type PostHandler = (request: Request) => Promise<Response>;

class RequestTooLargeError extends Error {}

export function createPostHandler(generator: PdfGenerator): PostHandler {
  return async (request: Request): Promise<Response> => {
    const contentType = request.headers
      .get("Content-Type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    if (contentType !== "application/json") {
      return jsonError(
        415,
        "UNSUPPORTED_MEDIA_TYPE",
        "Content-Type must be application/json",
      );
    }

    try {
      const body = await readBodyWithLimit(request, MAX_REQUEST_BYTES);
      let character: unknown;
      try {
        character = JSON.parse(body);
      } catch (error) {
        if (error instanceof SyntaxError) {
          return jsonError(
            400,
            "MALFORMED_JSON",
            "Request body must contain valid JSON",
          );
        }
        throw error;
      }

      const pdfBytes = await generator(character);
      const responseBytes = Uint8Array.from(pdfBytes).buffer;

      return new Response(responseBytes, {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "Content-Disposition": 'attachment; filename="character-sheet.pdf"',
          "Content-Type": "application/pdf",
        },
      });
    } catch (error) {
      if (error instanceof RequestTooLargeError) {
        return jsonError(
          413,
          "REQUEST_TOO_LARGE",
          `Request body exceeds the ${MAX_REQUEST_BYTES}-byte limit`,
        );
      }
      if (error instanceof PdfGenerationError) {
        return Response.json(
          {
            error: {
              code: "CHARACTER_GENERATION_FAILED",
              message: error.message,
              issues: error.issues,
            },
          },
          { status: 422, headers: { "Cache-Control": "no-store" } },
        );
      }

      console.error("Unexpected character-sheet generation failure", error);
      return jsonError(
        500,
        "INTERNAL_ERROR",
        "Unable to generate the character sheet",
      );
    }
  };
}

const postHandler = createPostHandler(generateCharacterSheet);

export async function POST(request: Request): Promise<Response> {
  return postHandler(request);
}

async function readBodyWithLimit(
  request: Request,
  maximumBytes: number,
): Promise<string> {
  const declaredLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new RequestTooLargeError();
  }

  if (request.body === null) return "";

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let totalBytes = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel();
      throw new RequestTooLargeError();
    }
    body += decoder.decode(value, { stream: true });
  }

  return body + decoder.decode();
}

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
