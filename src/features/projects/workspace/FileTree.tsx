import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  FilePlus2,
  FolderPlus,
  Folder,
  MoreVertical,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ProjectFileEntry } from "@/types";

interface FileTreeProps {
  entries: ProjectFileEntry[];
  activePath: string | null;
  loading: boolean;
  onOpenFile: (relPath: string) => void;
  onRefresh: () => void;
  onCreateFile: (relPath: string) => Promise<void>;
  onCreateFolder: (relPath: string) => Promise<void>;
  onDelete: (relPath: string) => Promise<void>;
  onRename: (relPath: string, newName: string) => Promise<void>;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  children: TreeNode[];
}

function buildTree(entries: ProjectFileEntry[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", isDir: true, size: 0, children: [] };

  for (const entry of entries) {
    const segments = entry.path.split("/");
    let current = root;
    for (let i = 0; i < segments.length; i++) {
      const isLast = i === segments.length - 1;
      const segPath = segments.slice(0, i + 1).join("/");
      let next = current.children.find((c) => c.name === segments[i]);
      if (!next) {
        next = {
          name: segments[i],
          path: segPath,
          isDir: isLast ? entry.is_dir : true,
          size: entry.is_dir ? 0 : entry.size_bytes,
          children: [],
        };
        current.children.push(next);
      }
      current = next;
    }
  }

  const sortRecursive = (node: TreeNode) => {
    node.children.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(sortRecursive);
  };
  sortRecursive(root);
  return root.children;
}

export function FileTree({
  entries,
  activePath,
  loading,
  onOpenFile,
  onRefresh,
  onCreateFile,
  onCreateFolder,
  onDelete,
  onRename,
}: FileTreeProps) {
  const tree = useMemo(() => buildTree(entries), [entries]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["build", ".gradle"]));

  const [createDialog, setCreateDialog] = useState<"file" | "folder" | null>(null);
  const [createPath, setCreatePath] = useState("");
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const handleCreate = async () => {
    if (!createDialog) return;
    const clean = createPath.trim().replace(/^\/+|\/+$/g, "");
    if (!clean) return;
    try {
      if (createDialog === "file") {
        await onCreateFile(clean);
      } else {
        await onCreateFolder(clean);
      }
      setCreateDialog(null);
      setCreatePath("");
    } catch (error) {
      toast.error("Creation failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    const clean = renameValue.trim();
    if (!clean || clean.includes("/")) return;
    try {
      await onRename(renameTarget, clean);
      setRenameTarget(null);
    } catch (error) {
      toast.error("Rename failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const toggle = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    const isCollapsed = collapsed.has(node.path);
    const isActive = activePath === node.path;

    return (
      <div key={node.path}>
        <div
          className={cn(
            "group flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors",
            isActive
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {node.isDir ? (
            <>
              <button
                className="shrink-0 text-muted-foreground/60"
                onClick={() => toggle(node.path)}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              <Folder
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  isCollapsed ? "text-muted-foreground/70" : "text-primary/80",
                )}
              />
              <button
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => toggle(node.path)}
                title={node.path}
              >
                {node.name}
              </button>
            </>
          ) : (
            <>
              <FileIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
              <button
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => onOpenFile(node.path)}
                title={node.path}
              >
                {node.name}
              </button>
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="invisible shrink-0 rounded p-0.5 hover:bg-accent group-hover:visible">
                <MoreVertical className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[10rem]">
              <DropdownMenuItem
                onClick={() => {
                  setRenameTarget(node.path);
                  setRenameValue(node.name);
                }}
              >
                <Pencil className="h-3.5 w-3.5" /> Rename…
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-400"
                onClick={() => {
                  void onDelete(node.path).catch((error) =>
                    toast.error(String(error)),
                  );
                }}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {node.isDir && !isCollapsed && (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Explorer
          {loading && <RefreshCw className="h-3 w-3 animate-spin" />}
        </span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="New file"
            onClick={() => setCreateDialog("file")}
          >
            <FilePlus2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="New folder"
            onClick={() => setCreateDialog("folder")}
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title="Refresh"
            onClick={onRefresh}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-1">
        {tree.length === 0 && !loading ? (
          <p className="px-3 py-6 text-center text-[11px] text-muted-foreground/60">
            No files found
          </p>
        ) : (
          tree.map((node) => renderNode(node, 0))
        )}
      </div>

      {/* Create dialog */}
      <Dialog
        open={createDialog !== null}
        onOpenChange={(open) => {
          if (!open) setCreateDialog(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              New {createDialog === "file" ? "file" : "folder"}
            </DialogTitle>
            <DialogDescription>
              Path relative to the project root.
              {createDialog === "file" &&
                " Tip: src/main/java/… for Java sources."}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            placeholder={
              createDialog === "file"
                ? "src/main/java/com/example/NewFile.java"
                : "src/main/resources/new-folder"
            }
            value={createPath}
            onChange={(e) => setCreatePath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialog(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} disabled={!createPath.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {renameTarget}
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleRename();
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => void handleRename()} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
