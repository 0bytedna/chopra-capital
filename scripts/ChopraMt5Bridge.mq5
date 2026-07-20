// Chopra Capital MT5 bridge for Linux/Wine or Windows terminals.
// Attach this Expert Advisor to any chart. It only reads account/trade data and
// POSTs it to the website; it never sends trading orders.
#property strict
#property version   "1.0"

input string IngestUrl = "https://yourdomain.com/api/mt5/ingest";
input string IngestToken = "replace-with-the-same-MT5_INGEST_TOKEN";
input int    IntervalSeconds = 5;
input int    ClosedLookbackDays = 30;

string EscapeJson(string value)
{
   StringReplace(value, "\\", "\\\\");
   StringReplace(value, "\"", "\\\"");
   StringReplace(value, "\r", "\\r");
   StringReplace(value, "\n", "\\n");
   return value;
}

string IsoUtc(datetime server_time)
{
   int offset = (int)(TimeTradeServer() - TimeGMT());
   datetime utc_time = server_time - offset;
   string result = TimeToString(utc_time, TIME_DATE | TIME_SECONDS);
   StringReplace(result, ".", "-");
   StringReplace(result, " ", "T");
   return result + "Z";
}

string Side(const long trade_type)
{
   return (trade_type == POSITION_TYPE_BUY || trade_type == DEAL_TYPE_BUY) ? "BUY" : "SELL";
}

string OpenPositionsJson()
{
   string rows = "";
   for(int i = 0; i < PositionsTotal(); i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket)) continue;
      if(StringLen(rows) > 0) rows += ",";
      rows += StringFormat(
         "{\"ticket\":\"%I64u\",\"symbol\":\"%s\",\"type\":\"%s\",\"volume\":%.8f,\"openPrice\":%.8f,\"closePrice\":null,\"profit\":%.8f,\"swap\":%.8f,\"commission\":0,\"status\":\"OPEN\",\"openTime\":\"%s\",\"closeTime\":null}",
         ticket,
         EscapeJson(PositionGetString(POSITION_SYMBOL)),
         Side(PositionGetInteger(POSITION_TYPE)),
         PositionGetDouble(POSITION_VOLUME),
         PositionGetDouble(POSITION_PRICE_OPEN),
         PositionGetDouble(POSITION_PROFIT),
         PositionGetDouble(POSITION_SWAP),
         IsoUtc((datetime)PositionGetInteger(POSITION_TIME))
      );
   }
   return rows;
}

string ClosedDealsJson()
{
   string rows = "";
   datetime to_time = TimeCurrent();
   datetime from_time = to_time - MathMax(1, ClosedLookbackDays) * 86400;
   if(!HistorySelect(from_time, to_time)) return rows;

   int count = HistoryDealsTotal();
   for(int i = 0; i < count; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0 || HistoryDealGetInteger(ticket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;
      long type = HistoryDealGetInteger(ticket, DEAL_TYPE);
      if(type != DEAL_TYPE_BUY && type != DEAL_TYPE_SELL) continue;
      if(StringLen(rows) > 0) rows += ",";
      double price = HistoryDealGetDouble(ticket, DEAL_PRICE);
      rows += StringFormat(
         "{\"ticket\":\"deal-%I64u\",\"symbol\":\"%s\",\"type\":\"%s\",\"volume\":%.8f,\"openPrice\":%.8f,\"closePrice\":%.8f,\"profit\":%.8f,\"swap\":%.8f,\"commission\":%.8f,\"status\":\"CLOSED\",\"openTime\":\"%s\",\"closeTime\":\"%s\"}",
         ticket,
         EscapeJson(HistoryDealGetString(ticket, DEAL_SYMBOL)),
         Side(type),
         HistoryDealGetDouble(ticket, DEAL_VOLUME),
         price, price,
         HistoryDealGetDouble(ticket, DEAL_PROFIT),
         HistoryDealGetDouble(ticket, DEAL_SWAP),
         HistoryDealGetDouble(ticket, DEAL_COMMISSION),
         IsoUtc((datetime)HistoryDealGetInteger(ticket, DEAL_TIME)),
         IsoUtc((datetime)HistoryDealGetInteger(ticket, DEAL_TIME))
      );
   }
   return rows;
}

void PushSnapshot()
{
   if(StringLen(IngestToken) < 24 || StringFind(IngestUrl, "https://") != 0)
   {
      Print("Set a HTTPS IngestUrl and a strong IngestToken before starting the bridge.");
      return;
   }

   string open_trades = OpenPositionsJson();
   string closed_trades = ClosedDealsJson();
   string json = StringFormat(
      "{\"account\":{\"login\":\"%I64d\",\"name\":\"%s\",\"server\":\"%s\",\"currency\":\"%s\",\"balance\":%.8f,\"equity\":%.8f,\"margin\":%.8f,\"freeMargin\":%.8f},\"trades\":[%s%s%s]}",
      AccountInfoInteger(ACCOUNT_LOGIN),
      EscapeJson(AccountInfoString(ACCOUNT_NAME)),
      EscapeJson(AccountInfoString(ACCOUNT_SERVER)),
      EscapeJson(AccountInfoString(ACCOUNT_CURRENCY)),
      AccountInfoDouble(ACCOUNT_BALANCE),
      AccountInfoDouble(ACCOUNT_EQUITY),
      AccountInfoDouble(ACCOUNT_MARGIN),
      AccountInfoDouble(ACCOUNT_MARGIN_FREE),
      open_trades,
      (StringLen(open_trades) > 0 && StringLen(closed_trades) > 0) ? "," : "",
      closed_trades
   );

   char body[];
   StringToCharArray(json, body, 0, -1, CP_UTF8);
   ArrayResize(body, ArraySize(body) - 1);
   char response[];
   string response_headers;
   string headers = "Content-Type: application/json\r\nX-MT5-Token: " + IngestToken + "\r\n";
   ResetLastError();
   int status = WebRequest("POST", IngestUrl, headers, 15000, body, response, response_headers);
   if(status < 200 || status >= 300)
      PrintFormat("Chopra bridge push failed: HTTP %d, MQL error %d", status, GetLastError());
   else
      PrintFormat("Chopra bridge updated: equity %.2f, HTTP %d", AccountInfoDouble(ACCOUNT_EQUITY), status);
}

int OnInit()
{
   EventSetTimer(MathMax(1, IntervalSeconds));
   PushSnapshot();
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) { EventKillTimer(); }
void OnTimer() { PushSnapshot(); }
