/// <reference types="vite/client" />
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, type ClientConfig, type SanityClient } from '@sanity/client';

const isDev = import.meta.env.DEV;
const isDeployPreview = process.env.CONTEXT === 'deploy-preview';

// Access environment variables directly
const SANITY_PROJECT_ID = import.meta.env.SANITY_PROJECT_ID || process.env.SANITY_PROJECT_ID || "ewp1qyix";
const SANITY_DATASET = import.meta.env.SANITY_DATASET || process.env.SANITY_DATASET || "production";
const SANITY_TOKEN = import.meta.env.SANITY_TOKEN || process.env.SANITY_TOKEN;
const STACKBIT_PREVIEW = import.meta.env.STACKBIT_PREVIEW;
const SANITY_PREVIEW_DRAFTS = import.meta.env.SANITY_PREVIEW_DRAFTS;

const previewDrafts = STACKBIT_PREVIEW?.toLowerCase() === 'true' || SANITY_PREVIEW_DRAFTS?.toLowerCase() === 'true';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const sanityConfig: ClientConfig = {
    projectId: SANITY_PROJECT_ID,
    dataset: SANITY_DATASET,
    useCdn: !isDev,
    apiVersion: '2024-01-31',
    token: SANITY_TOKEN,
    perspective: isDev || isDeployPreview || previewDrafts ? 'previewDrafts' : 'published'
};

export const client = createClient(sanityConfig);

/**
 * @param {SanityClient} client The Sanity client to add the listener to
 * @param {Array<String>} types An array of types the listener should take an action on
 * Creating Sanity listener to subscribe to whenever a new document is created or deleted to refresh the list in Create
 */
[{ client: client, types: ['page'] }].forEach(({ client, types }: { client: SanityClient; types: Array<String> }) =>
    client.listen(`*[_type in ${JSON.stringify(types)}]`, {}, { visibility: 'query' }).subscribe(async (event: any) => {
        // only refresh when pages are deleted or created
        if (event.transition === 'appear' || event.transition === 'disappear') {
            const filePath = path.join(__dirname, '../layouts/Layout.astro');
            const time = new Date();
            
            // update the updatedat stamp for the layout file, triggering astro to refresh the data in getStaticPaths
            await fs.promises.utimes(filePath, time, time);
        }
    })
);
