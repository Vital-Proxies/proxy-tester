import { Proxy } from "@/types";
import { Clipboard, Eye, Trash } from "lucide-react";
import { AlertDialogTrigger } from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useProxyTesterStore } from "@/store/proxy";
import useCopyToClipboard from "@/hooks/useCopyToClipboard";
import DetailsDialog from "./dialog-details";

export default function TableRowActions({ proxy }: { proxy: Proxy }) {
  const [isProxyCopied, copyProxy] = useCopyToClipboard();

  const { removeTestedProxy } = useProxyTesterStore();

  return (
    <div className="flex items-center justify-end gap-1">
      <DetailsDialog proxy={proxy}>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Eye className="size-4" />
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>View Details</p>
          </TooltipContent>
        </Tooltip>
      </DetailsDialog>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => copyProxy(proxy.raw)}
          >
            <Clipboard className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isProxyCopied ? <p>Copied!</p> : <>Copy Proxy</>}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => removeTestedProxy(proxy)}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <Trash className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Delete</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
