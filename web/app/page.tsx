import { Heading, Text, Button, Flex, Section, Container } from '@radix-ui/themes';

export default function HomePage() {
  return (
    <main>
      <Section size="3">
        <Container size="3">
          <Flex direction="column" align="center" gap="5" style={{ textAlign: 'center', paddingTop: '6rem' }}>
            <Heading size="9" weight="bold">
              Caregiving, together.
            </Heading>
            <Text size="4" color="gray" style={{ maxWidth: 560 }}>
              Care makes the invisible labor of caregiving visible, shared, and manageable.
              Coordinate aging parent care, kids, pets, and everything in between.
            </Text>
            <Flex gap="3" mt="4">
              <Button size="4" variant="solid">
                Download the app
              </Button>
              <Button size="4" variant="outline">
                Learn more
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Section>
    </main>
  );
}
