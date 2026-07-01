import type { CatalogDay } from "./catalogTypes";

export const DRIVE_PUBLISHER_ORDER_SCHEMA =
  "terra-viva-web-publisher-order/v1";
export const DRIVE_PUBLISHER_STATUS_SCHEMA =
  "terra-viva-web-publisher-status/v1";
export const DRIVE_PUBLISHER_MAILBOX_SCHEMA =
  "terra-viva-web-publisher/v1";

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
  schema: typeof DRIVE_PUBLISHER_ORDER_SCHEMA;
  orderId: string;
  action: PublisherOrderAction;
  createdAt: string;
  createdBy: "admin-web";
  catalogDate?: string;
  approvalCatalog?: CatalogDay;
  approvalCatalogSignature?: string;
  sourceSessionId?: string;
};

export type DrivePublisherStatus = {
  schema: typeof DRIVE_PUBLISHER_STATUS_SCHEMA;
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
  schema: typeof DRIVE_PUBLISHER_MAILBOX_SCHEMA;
  order: DrivePublisherOrder | null;
  status: DrivePublisherStatus | null;
};

export type LegacyDrivePublisherOrder = Omit<DrivePublisherOrder, "schema"> & {
  id?: string;
  orderId?: string;
};

export type LegacyDrivePublisherStatus = Partial<DrivePublisherStatus> & {
  schema?: string;
};
