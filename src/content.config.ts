import {defineCollection, z} from 'astro:content';
import {glob} from 'astro/loaders';

// The schema mirrors `cms-config.yml`'s `fields` on purpose: the CMS writes
// the frontmatter and Astro validates it, so a widget that writes the wrong
// shape fails the BUILD rather than rendering a broken page. That is the
// whole reason this test site is worth having.
const blog = defineCollection({
    loader: glob({pattern: '**/*.md', base: './src/content/blog'}),
    schema: z.object({
        title: z.string(),
        date: z.coerce.date(),
        description: z.string().optional(),
        draft: z.boolean().default(false)
    })
});

export const collections = {blog};
