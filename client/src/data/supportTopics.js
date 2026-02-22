import supportTopicGroups from "./supportTopics.json";

export const SUPPORT_TOPIC_GROUPS = supportTopicGroups;

export const SUPPORT_TOPICS = SUPPORT_TOPIC_GROUPS.flatMap((group) => group.topics);

export const SUPPORT_FOOTER_COLUMNS = SUPPORT_TOPIC_GROUPS.map((group) => ({
  title: group.title,
  links: group.topics.map((topic) => ({
    label: topic.title,
    slug: topic.slug,
  })),
}));
