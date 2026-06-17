export async function addAssetStock(apiClient, payload) {
  const sanitizedPayload = {
    name: String(payload.name || "").trim(),
    type: String(payload.type || "").trim(),
    quantity: Number(payload.quantity),
    location: String(payload.location || "").trim(),
    vendor: String(payload.vendor || "").trim(),
    purchaseDate: String(payload.purchaseDate || "").trim(),
    warrantyExpiry: String(payload.warrantyExpiry || "").trim(),
    unitCost:
      payload.unitCost === "" || payload.unitCost === null || payload.unitCost === undefined
        ? undefined
        : Number(payload.unitCost),
    remarks: String(payload.remarks || "").trim(),
    source: String(payload.source || "purchase").trim(),
    serialNumbers: Array.isArray(payload.serialNumbers)
      ? payload.serialNumbers.map((item) => String(item || "").trim()).filter(Boolean)
      : [],
  };

  return apiClient.post("/assets/add-stock", sanitizedPayload);
}
