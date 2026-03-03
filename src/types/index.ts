export interface Size {
  width: number;
  height: number;
}

export interface CheckHistoryItem {
  id: string;
  orderNo: string;
  fileName: string;
  fileType: "pdf" | "ai";
  status: "processing" | "done" | "error";
  judgement: "OK" | "NG" | "UNDETERMINED";
  fontOutlineOk?: boolean;
  cmykOk?: boolean;
  resolutionOk?: boolean;
  lineWidthOk?: boolean;
  comment: string;
  createdAt: string;
}
