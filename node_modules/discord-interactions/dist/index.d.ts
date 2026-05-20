/// <reference types="node" />
/// <reference types="node" />
import type { NextFunction, Request, Response } from 'express';
/**
 * The type of interaction this request is.
 */
export declare enum InteractionType {
    /**
     * A ping.
     */
    PING = 1,
    /**
     * A command invocation.
     */
    APPLICATION_COMMAND = 2,
    /**
     * Usage of a message's component.
     */
    MESSAGE_COMPONENT = 3,
    /**
     * An interaction sent when an application command option is filled out.
     */
    APPLICATION_COMMAND_AUTOCOMPLETE = 4,
    /**
     * An interaction sent when a modal is submitted.
     */
    MODAL_SUBMIT = 5
}
/**
 * The type of response that is being sent.
 */
export declare enum InteractionResponseType {
    /**
     * Acknowledge a `PING`.
     */
    PONG = 1,
    /**
     * Respond with a message, showing the user's input.
     */
    CHANNEL_MESSAGE_WITH_SOURCE = 4,
    /**
     * Acknowledge a command without sending a message, showing the user's input. Requires follow-up.
     */
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
    /**
     * Acknowledge an interaction and edit the original message that contains the component later; the user does not see a loading state.
     */
    DEFERRED_UPDATE_MESSAGE = 6,
    /**
     * Edit the message the component was attached to.
     */
    UPDATE_MESSAGE = 7,
    APPLICATION_COMMAND_AUTOCOMPLETE_RESULT = 8,
    MODAL = 9,
    PREMIUM_REQUIRED = 10,
    /**
     * Launch an Activity.
     */
    LAUNCH_ACTIVITY = 12
}
/**
 * Flags that can be included in an Interaction Response.
 */
export declare enum InteractionResponseFlags {
    /**
     * Show the message only to the user that performed the interaction. Message
     * does not persist between sessions.
     */
    EPHEMERAL = 64,
    /**
     * Allows you to create fully component-driven messages
     * @see {@link https://discord.com/developers/docs/components/reference}
     */
    IS_COMPONENTS_V2 = 32768
}
/**
 * Validates a payload from Discord against its signature and key.
 *
 * @param rawBody - The raw payload data
 * @param signature - The signature from the `X-Signature-Ed25519` header
 * @param timestamp - The timestamp from the `X-Signature-Timestamp` header
 * @param clientPublicKey - The public key from the Discord developer dashboard
 * @returns Whether or not validation was successful
 */
export declare function verifyKey(rawBody: Uint8Array | ArrayBuffer | Buffer | string, signature: string, timestamp: string, clientPublicKey: string | CryptoKey): Promise<boolean>;
/**
 * Creates a middleware function for use in Express-compatible web servers for verifying Interaction Webhooks.
 *
 * @param clientPublicKey - The public key from the Discord developer dashboard
 * @returns The middleware function
 */
export declare function verifyKeyMiddleware(clientPublicKey: string): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Creates a middleware function for use in Express-compatible web servers for verifying Event Webhooks.
 *
 * @param clientPublicKey - The public key from the Discord developer dashboard
 * @returns The middleware function
 */
export declare function verifyWebhookEventMiddleware(clientPublicKey: string): (req: Request, res: Response, next: NextFunction) => void;
export * from './components';
export * from './webhooks';
