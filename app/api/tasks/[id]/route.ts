import { NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/server";
import { TasksService } from "@/lib/services/tasks.service";
import {
  ok,
  noContent,
  badRequest,
  unauthorized,
  notFound,
  serverError,
} from "@/lib/api/response";

const idSchema = z.string().uuid();

const updateTaskSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  assigneeId: z.string().uuid().optional(),
  completed: z.boolean().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) return badRequest({ message: "ID inválido" });

  const body = await request.json().catch(() => null);
  if (!body)
    return badRequest({ message: "JSON inválido no corpo da requisição" });

  const parsed = updateTaskSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  try {
    const task = await TasksService.update(
      supabase,
      idParsed.data,
      parsed.data,
    );
    return ok(task);
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound("Tarefa");
    console.error("[PUT /api/tasks/:id]", err);
    return serverError();
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const idParsed = idSchema.safeParse(id);
  if (!idParsed.success) return badRequest({ message: "ID inválido" });

  try {
    await TasksService.delete(supabase, idParsed.data);
    return noContent();
  } catch (err: unknown) {
    if (isNotFoundError(err)) return notFound("Tarefa");
    console.error("[DELETE /api/tasks/:id]", err);
    return serverError();
  }
}

function isNotFoundError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "PGRST116"
  );
}
