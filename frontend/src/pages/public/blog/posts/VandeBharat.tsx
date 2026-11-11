import { Link } from 'react-router-dom'
import { TravelPartnerLink } from '../../TravelPartnerLink'

export default function VandeBharat() {
  return (
    <>
      <p className="lead">
        The railway into the Kashmir valley has changed how many of our visitors arrive. Engineers
        coming from Jammu, Punjab or Delhi can now reach the site without a flight, and for anyone
        in the profession the journey is half the reason to take it.
      </p>

      <h2>The train</h2>
      <p>
        The Vande Bharat Express runs from Jammu Tawi to Srinagar, stopping at Katra and Banihal. It
        takes about three hours from Katra and a little under five from Jammu Tawi. Timetables change
        with the season, and May, June and the holiday weeks fill early, so book as soon as your dates
        are fixed. Falcon Trails keeps a current page on <TravelPartnerLink path="/kashmir/delhi-to-srinagar-train">Vande
        Bharat timings and the rail route from Delhi</TravelPartnerLink>.
      </p>
      <p>
        Allow time for a security check before boarding, and keep your luggage to what you can lift
        onto the rack yourself.
      </p>

      <h2>What to look out for on the way</h2>
      <p>
        The line through the mountains is one of the most ambitious pieces of civil engineering in
        the country. Between Katra and Banihal it crosses the Chenab bridge, the highest railway arch
        bridge in the world, and the Anji Khad bridge, India's first cable-stayed railway bridge.
        Beyond Banihal it passes under the Pir Panjal range through an 11 km tunnel and comes out in
        the valley at Qazigund.
      </p>

      <h2>From Srinagar station to the site</h2>
      <p>
        Srinagar station is at Nowgam, on the southern edge of the city. The plant is at Nishat, on
        the eastern shore of Dal Lake: about 22 km by road, right across the city. Allow 45 minutes to
        an hour. Book a cab before you travel rather than looking for one on the platform;
        Falcon Trails lists <TravelPartnerLink path="/kashmir/taxi-service">taxi rates for transfers
        in Srinagar</TravelPartnerLink> if you want a guide to what a fair fare is.
      </p>
      <p>
        Distances from the airport, the city centre and the main pumping station are in our note
        on <Link to="/site/blog/distances-from-nishat-site">how far the Nishat site is</Link>.
      </p>

      <h2>Train or flight?</h2>
      <p>
        From most of India, flying is still faster door to door: Delhi to Srinagar is about an hour
        and a half in the air. The train makes sense from Jammu, Katra and the Punjab, when flights
        are full or expensive, or when the railway itself is part of the reason for the trip. In
        winter, whichever you choose, keep a spare day before anything you cannot move.
      </p>
    </>
  )
}
