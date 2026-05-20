"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhookEventType = exports.WebhookType = void 0;
/**
 * @see {@link https://discord.com/developers/docs/events/webhook-events#webhook-types}
 */
var WebhookType;
(function (WebhookType) {
    /**
     * A ping.
     */
    WebhookType[WebhookType["PING"] = 0] = "PING";
    /**
     * A webhook event.
     */
    WebhookType[WebhookType["EVENT"] = 1] = "EVENT";
})(WebhookType || (exports.WebhookType = WebhookType = {}));
/**
 * Events to which an app can subscribe to
 * @see {@link https://discord.com/developers/docs/events/webhook-events#event-types}
 */
var WebhookEventType;
(function (WebhookEventType) {
    /**
     * Event sent when an app was authorized by a user to a server or their account.
     */
    WebhookEventType["APPLICATION_AUTHORIZED"] = "APPLICATION_AUTHORIZED";
    /**
     * Event sent when an app was deauthorized by a user.
     */
    WebhookEventType["APPLICATION_DEAUTHORIZED"] = "APPLICATION_DEAUTHORIZED";
    /**
     * Event sent when an entitlement was created.
     */
    WebhookEventType["ENTITLEMENT_CREATE"] = "ENTITLEMENT_CREATE";
    /**
     * Event sent when a user was added to a Quest.
     */
    WebhookEventType["QUEST_USER_ENROLLMENT"] = "QUEST_USER_ENROLLMENT";
    /**
     * Event sent when a message is created in a lobby.
     */
    WebhookEventType["LOBBY_MESSAGE_CREATE"] = "LOBBY_MESSAGE_CREATE";
    /**
     * Event sent when a message is updated in a lobby.
     */
    WebhookEventType["LOBBY_MESSAGE_UPDATE"] = "LOBBY_MESSAGE_UPDATE";
    /**
     * Event sent when a message is deleted from a lobby.
     */
    WebhookEventType["LOBBY_MESSAGE_DELETE"] = "LOBBY_MESSAGE_DELETE";
    /**
     * Event sent when a direct message is created during an active Social SDK session.
     */
    WebhookEventType["GAME_DIRECT_MESSAGE_CREATE"] = "GAME_DIRECT_MESSAGE_CREATE";
    /**
     * Event sent when a direct message is updated during an active Social SDK session.
     */
    WebhookEventType["GAME_DIRECT_MESSAGE_UPDATE"] = "GAME_DIRECT_MESSAGE_UPDATE";
    /**
     * Event sent when a direct message is deleted during an active Social SDK session.
     */
    WebhookEventType["GAME_DIRECT_MESSAGE_DELETE"] = "GAME_DIRECT_MESSAGE_DELETE";
})(WebhookEventType || (exports.WebhookEventType = WebhookEventType = {}));
//# sourceMappingURL=webhooks.js.map