import { useState, useMemo } from "react";
import { Search, Download, Eye, LayoutGrid, List, FileText, FileSpreadsheet, FileCode, Files } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { documents, type DocumentItem } from "@/data/mock";
import { cn } from "@/lib/utils";

const categories = ["All", "Commercials", "Manuals", "Drawings", "Commissioning Reports"] as const;

const fileIcon = (type: DocumentItem["type"]) => {
  if (type === "xlsx") return FileSpreadsheet;
  if (type === "dwg") return FileCode;
  return FileText;
};

const typeColor = (type: DocumentItem["type"]) => {
  switch (type) {
    case "pdf": return "text-destructive bg-destructive/10";
    case "xlsx": return "text-success bg-success/10";
    case "dwg": return "text-accent bg-accent/10";
    case "docx": return "text-accent bg-accent/10";
    default: return "text-muted-foreground bg-muted";
  }
};

export default function Documents() {
  const [category, setCategory] = useState<typeof categories[number]>("All");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");

  const filtered = useMemo(() => {
    return documents.filter(
      (d) =>
        (category === "All" || d.category === category) &&
        d.name.toLowerCase().includes(query.toLowerCase()),
    );
  }, [category, query]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: documents.length };
    documents.forEach((d) => (map[d.category] = (map[d.category] ?? 0) + 1));
    return map;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Document library</p>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight mt-1">Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All commercials, drawings, manuals & commissioning reports — version controlled.
          </p>
        </div>
      </div>

      {/* Filters bar */}
      <Card className="card-elevated">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents…"
                className="h-10 pl-9 bg-muted/40 focus-visible:bg-background"
              />
            </div>
            <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
              <Button
                variant={view === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5"
                onClick={() => setView("list")}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5"
                onClick={() => setView("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all",
                  category === c
                    ? "border-accent bg-accent text-accent-foreground shadow-elev-sm"
                    : "border-border bg-background text-muted-foreground hover:border-accent/30 hover:text-foreground",
                )}
              >
                <Files className="h-3.5 w-3.5" />
                {c}
                <span className={cn(
                  "rounded-full px-1.5 text-[10px] font-bold tabular-nums",
                  category === c ? "bg-accent-foreground/20" : "bg-muted",
                )}>
                  {counts[c] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {view === "list" ? (
        <Card className="card-elevated overflow-hidden">
          <Table>
            <TableHeader className="sticky top-16 bg-muted/40 backdrop-blur z-10">
              <TableRow className="hover:bg-transparent border-border">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider w-[44%]">Document</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Category</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Version</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Updated</TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider">Owner</TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => {
                const Icon = fileIcon(d.type);
                return (
                  <TableRow key={d.id} className="group border-border">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-md text-[10px] font-bold uppercase", typeColor(d.type))}>
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{d.name}</p>
                          <p className="text-[11px] text-muted-foreground">{d.size}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-medium text-muted-foreground">{d.category}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold tabular-nums">{d.version}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs tabular-nums text-muted-foreground">{d.updatedDate}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] font-semibold bg-muted">{d.owner.initials}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{d.owner.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Files className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm font-semibold mt-3">No documents found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filter.</p>
            </div>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((d) => {
            const Icon = fileIcon(d.type);
            return (
              <Card key={d.id} className="card-elevated group">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", typeColor(d.type))}>
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <span className="font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">{d.version}</span>
                  </div>
                  <p className="text-sm font-semibold mt-3 line-clamp-2 leading-snug">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{d.category} · {d.size}</p>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5"><AvatarFallback className="text-[9px] bg-muted">{d.owner.initials}</AvatarFallback></Avatar>
                      <span className="text-[11px] text-muted-foreground">{d.updatedDate}</span>
                    </div>
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
