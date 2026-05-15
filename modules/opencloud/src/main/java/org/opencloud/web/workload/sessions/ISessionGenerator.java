package org.opencloud.web.workload.sessions;

import org.opencloud.web.WebSession;

/**
 * Generates sessions per given time.
 * 
 * @author nikolay.grozev
 * 
 */
public interface ISessionGenerator {

    /**
     * Generates a session for the specified time.
     * 
     * @param time
     *            - the time to generate the session for. Must be a valid
     *            simulation time.
     * @return the generated session.
     */
    WebSession generateSessionAt(final double time);
}
