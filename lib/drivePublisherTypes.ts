import type { CatalogDay } from "./catalogTypes";

export type PublisherOrderAction =
  | "process_draft"
  | "publish_approved"
  | "cancel_draft";

export type PublisherOrderState =
  | "queued"
  | "running"
  | "succeeded"
  | "failed"
  | "cancelled";

export type DrivePublisherOrder = {
  id: string;
  action: PublisherOrderAction;
  createdAt: string;
  createdBy: "admin-web";
  catalogDate?: string;
  approvalCatalog?: CatalogDay;
  approvalCatalogSignature?: string;
};

export type DrivePublisherStatus = {
  orderId: string;
  action: PublisherOrderAction;
  state: PublisherOrderState;
  createdAt: string;
  updatedAt: string;
  message: string;
  result?: {
    catalogDate?: string;
    momentCount?: number;
    draftReviewUrl?: string;
    publishedCatalogUrl?: string;
    approvalCatalogSignature?: string;
    deployment?: {
      branch: string;
      catalogDate: string;
      commitSha?: string;
      committed: boolean;
      pushed: boolean;
    };
  };
};

export type DrivePublisherMailbox = {
  schema: "terra-viva-web-publisher/v1";
  order: DrivePublisherOrder | null;
  status: DrivePublisherStatus | null;
};
