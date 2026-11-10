import { NextResponse } from "next/server";
import { getDataSource } from "@/lib/data-source";

export async function GET() {
  try {
    const dataSource = await getDataSource();
    const result = await dataSource.query("SELECT 1 AS result");

    return NextResponse.json({
      status: "ok",
      database: "connected",
      queryResult: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error connecting to database";
    return NextResponse.json(
      {
        status: "error",
        database: "disconnected",
        message,
      },
      { status: 500 }
    );
  }
}
