Table of Contents
-----------------

1. Directory structure of the OpenCloud Toolkit
2. Software requirements: Java version 8 or newer 
3. Installation and running the OpenCloud Toolkit
4. Running the OpenCloud examples
5. Learning OpenCloud



1. Directory structure of the OpenCloud Toolkit
----------------------------------------------

opencloud/                -- top level OpenCloud directory
	docs/            -- OpenCloud API Documentation
	examples/        -- OpenCloud examples
	jars/            -- OpenCloud jar archives
	sources/         -- OpenCloud source code
	tests/           -- OpenCloud unit tests


2. Software requirements: Java version 8 or newer
---------------------------------------------------

OpenCloud has been tested and ran on Sun's Java version 8 or newer.
Older versions of Java are not compatible.
If you have non-Sun Java version, such as gcj or J++, they may not be compatible.
You also need to install Ant to compile OpenCloud (explained in more details later).


3. Installation and running the OpenCloud Toolkit
------------------------------------------------

You just need to unpack the OpenCloud file to install.
If you want to remove OpenCloud, then remove the whole opencloud directory.
You do not need to compile OpenCloud source code. The JAR files are
provided to compile and to run OpenCloud applications:

  * jars/opencloud-<VERSION>.jar                    -- contains the OpenCloud class files
  * jars/opencloud-<VERSION>-sources.jar            -- contains the OpenCloud source code files
  * jars/opencloud-examples-<VERSION>.jar           -- contains the OpenCloud examples class files
  * jars/opencloud-examples-<VERSION>-sources.jar   -- contains the OpenCloud examples source code files


4. Running the OpenCloud examples
--------------------------------

Please read how to run the OpenCloud examples in examples.txt


5. Learning OpenCloud
--------------------

To understand how to use OpenCloud, please go through the examples provided
in the examples/ directory.

