package org.opencloud;

import org.opencloud.core.CloudActionTags;
import org.opencloud.core.OpenCloud;
import org.opencloud.core.predicates.*;
import org.opencloud.util.DummyEntity;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Calendar;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class PredicatesTest {

	private DummyEntity sender;
	private DummyEntity receiver;

	@BeforeEach
	void setup() {
		OpenCloud.init(2, Calendar.getInstance(), false);
		sender = new DummyEntity("Sender");
		receiver = new DummyEntity("Receiver");
	}

	@Test
	void testPredicateFromPositive() {
		sender.onStart = () -> {
			receiver.waitForEvent(new PredicateFrom(sender.getId()));
			sender.schedule(receiver.getId(), 1, null, "");
		};
		OpenCloud.run();

		assertEquals(1, receiver.receivedEvents().size());
	}

	@Test
	void testPredicateFromNegative() {
		sender.onStart = () -> {
			receiver.waitForEvent(new PredicateFrom(OpenCloud.getCloudInfoServiceEntityId()));
			sender.schedule(receiver.getId(), 1, null, "");
		};
		OpenCloud.run();

		assertEquals(0, receiver.receivedEvents().size());
	}

	@Test
	void testPredicateNone() {
		sender.onStart = () -> {
			receiver.waitForEvent(new PredicateNone());
			sender.schedule(receiver.getId(), 1, null, "");
		};
		OpenCloud.run();

		assertEquals(0, receiver.receivedEvents().size());
	}

	@Test
	void testPredicateNotFromPositive() {
		sender.onStart = () -> {
			receiver.waitForEvent(new PredicateNotFrom(OpenCloud.getCloudInfoServiceEntityId()));
			sender.schedule(receiver.getId(), 1, null, "");
		};
		OpenCloud.run();

		assertEquals(1, receiver.receivedEvents().size());
	}

	@Test
	void testPredicateNotFromNegative() {
		sender.onStart = () -> {
			receiver.waitForEvent(new PredicateNotFrom(sender.getId()));
			sender.schedule(receiver.getId(), 1, null, "");
		};
		OpenCloud.run();

		assertEquals(0, receiver.receivedEvents().size());
	}


	@Test
	void testPredicateNotTypeNegative() {
		sender.onStart = () -> {
			receiver.waitForEvent(new PredicateNotType(CloudActionTags.CLOUDLET_CANCEL));
			sender.schedule(receiver.getId(), 1, CloudActionTags.BLANK, "");
		};
		OpenCloud.run();

		assertEquals(1, receiver.receivedEvents().size());
	}

	@Test
	void testPredicateNotTypePositive() {
		sender.onStart = () -> {
			receiver.waitForEvent(new PredicateNotType(CloudActionTags.BLANK));
			sender.schedule(receiver.getId(), 1, CloudActionTags.BLANK, "");
		};
		OpenCloud.run();

		assertEquals(0, receiver.receivedEvents().size());
	}


	@Test
	void testPredicateTypePositive() {
		sender.onStart = () -> {
			receiver.waitForEvent(new PredicateType(CloudActionTags.BLANK));
			sender.schedule(receiver.getId(), 1, CloudActionTags.BLANK, "");
		};
		OpenCloud.run();

		assertEquals(1, receiver.receivedEvents().size());
	}

	@Test
	void testPredicateTypeNegative() {
		sender.onStart = () -> {
			receiver.waitForEvent(new PredicateType(CloudActionTags.RETURN_STAT_LIST));
			sender.schedule(receiver.getId(), 1, CloudActionTags.BLANK, "");
		};
		OpenCloud.run();

		assertEquals(0, receiver.receivedEvents().size());
	}
}